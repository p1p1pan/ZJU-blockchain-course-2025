// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// Uncomment the line to use openzeppelin/ERC721,ERC20
// You can use this dependency directly because it has been installed by TA already
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // 用于访问控制
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol"; // 防止重入攻击

// Uncomment this line to use console.log
// import "hardhat/console.sol";

// ERC20积分合约
contract BetToken is ERC20, Ownable {
    constructor() ERC20("BetToken", "BET") Ownable(msg.sender) {}
    
    // 用户领取积分
    function claimTokens() external {
        _mint(msg.sender, 1000 * 10**18); // 每次领取1000个积分
    }
    
    // 管理员铸造积分
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

// ERC721彩票凭证合约
contract LotteryTicket is ERC721, Ownable {
    uint256 private _nextTokenId;
    mapping(uint256 => uint256) public tokenToActivity; // tokenId -> activityId
    mapping(uint256 => uint256) public tokenToChoice; // tokenId -> choiceIndex
    mapping(uint256 => uint256) public tokenToAmount; // tokenId -> betAmount
    
    constructor() ERC721("LotteryTicket", "LOT") Ownable(msg.sender) {}
    
    function mint(address to, uint256 activityId, uint256 choiceIndex, uint256 amount) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        tokenToActivity[tokenId] = activityId;
        tokenToChoice[tokenId] = choiceIndex;
        tokenToAmount[tokenId] = amount;
        return tokenId;
    }
}

contract EasyBet is Ownable, ReentrancyGuard {

    //活动创建事件
    event activityCreated(
        uint256 indexed activityId,
        address indexed creator,
        string description,
        uint256 listedTimestamp
    );
    //下注事件
    event BetPlaced(uint256 indexed activityId, address indexed player, uint256 choiceIndex, uint256 amount);
    //活动结算事件
    event ActivityResolved(uint256 indexed activityId, uint256 winningChoiceIndex);
    //领取奖励事件
    event WinningsClaimed(uint256 indexed activityId, address indexed player, uint256 amount);
    // 彩票交易事件
    event TicketListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event TicketDelisted(uint256 indexed tokenId);
    event TicketBought(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);
    // 积分下注事件
    event TokenBetPlaced(uint256 indexed activityId, address indexed player, uint256 choiceIndex, uint256 amount);
    
    // maybe you need a struct to store some activity information
    struct Activity {
        address owner; // 创建者
        uint256 listedTimestamp; //截止时间
        string[] choices; //选项(需大于等于二)
        string description; // 活动描述
        bool over; // 是否结束
        uint256 winningChoice; //正确选项
        uint256 totalAmount; // 奖池总金额
        mapping(uint256 => uint256) amountsPerChoice; //每个选项的总投注金额
    }

    struct Bet {
        uint256 choiceIndex; // 用户选择的选项索引
        uint256 amount; // 用户投注的金额 (ETH)
        bool claimed; // 用户是否已领取奖金
    }

    // 彩票交易相关结构
    struct TicketListing {
        address seller;
        uint256 price;
        bool isListed;
    }

    // 订单簿结构
    struct OrderBook {
        uint256[] tokenIds; // 按价格排序的tokenId列表
    }

    uint256 nextActivityId; //下一个活动id(每个活动id是唯一的，按顺序生成)
    mapping(uint256 => Activity) public activities; // A map from activity-index to its information
    mapping(uint256 => mapping(address => Bet)) public userBets; // 存储用户的投注信息
    mapping(uint256 => address[]) public activityPlayers; // 存储每个活动的参与用户
    
    // 新增的合约实例
    BetToken public betToken;
    LotteryTicket public lotteryTicket;
    
    // 彩票交易相关映射
    mapping(uint256 => TicketListing) public ticketListings; // tokenId -> 挂牌信息
    mapping(uint256 => OrderBook) activityOrderBooks; // activityId -> 订单簿
    mapping(uint256 => mapping(uint256 => uint256)) public choiceOrderBooks; // activityId -> choiceIndex -> 订单簿

    constructor() Ownable(msg.sender) {
        //构造时初始化活动id，并且给创建者赋予管理员权限
        nextActivityId = 0;
        // 部署ERC20和ERC721合约
        betToken = new BetToken();
        lotteryTicket = new LotteryTicket();
        // 将EasyBet合约设为BetToken的owner
        betToken.transferOwnership(address(this));
        lotteryTicket.transferOwnership(address(this));
    }
    //创建活动功能
    function CreateActivity(
        string memory _description,
        string[] memory _choices,
        uint256 _listedTimerstamp
    ) external payable onlyOwner {
        // 传入创建的活动时间和选项还有截止时间以及初始奖金
        require(_choices.length >= 2, "must have choice more than 1");
        require(_listedTimerstamp > block.timestamp,"stop time must later then now");
        require(msg.value > 0, "Initial pot should be provided");

        uint256 newActivityId = nextActivityId++;
        Activity storage newActivity = activities[newActivityId];
        newActivity.owner = msg.sender;
        newActivity.description = _description;
        newActivity.choices = _choices;
        newActivity.listedTimestamp = _listedTimerstamp;
        newActivity.over = false;
        newActivity.totalAmount = msg.value;

        emit activityCreated(
            newActivityId,
            msg.sender,
            _description,
            _listedTimerstamp
        );
    }
    // 下注功能
    function Placebet(uint256 _activityId, uint256 _choice)
        external
        payable
        nonReentrant
    {
        Activity storage activity = activities[_activityId];
        require(_activityId < nextActivityId && activity.owner != address(0),"Activity does not exist"); // 活动必须存在
        require(activity.over == false, "Activity is over"); // 活动必须仍在进行
        require(block.timestamp < activity.listedTimestamp,"Activity bet time is ended");
        require(_choice < activity.choices.length, "Invalid choice index");
        require(msg.value > 0, "Bet amount must be greater than zero");

        Bet storage bet = userBets[_activityId][msg.sender];
        if (bet.amount > 0) {
            require(bet.choiceIndex == _choice,"Cannot bet on multiple choices in one activity"); // 限制只能投一个选项
            bet.amount += msg.value;
        } else {
            bet.choiceIndex = _choice;
            bet.claimed = false;
            bet.amount = msg.value;
            activityPlayers[_activityId].push(msg.sender); // 首次投注时记录玩家
        }
        //更新活动状态
        activities[_activityId].totalAmount += msg.value;
        activities[_activityId].amountsPerChoice[_choice] += msg.value;

        // 铸造彩票凭证NFT
        uint256 tokenId = lotteryTicket.mint(msg.sender, _activityId, _choice, msg.value);

        emit BetPlaced(_activityId, msg.sender, _choice, msg.value);
    }
    // 结算活动
    function ResolveActivity(uint256 _activityId, uint256 _winningChoice ) external onlyOwner {
        Activity storage activity = activities[_activityId];
        require(_activityId < nextActivityId && activity.owner != address(0), "Activity does not exist");// 活动必须存在
        require(!activity.over, "Activity already resolved"); // 活动不能结算两次
        require(_winningChoice < activity.choices.length, "Invalid winning choice index");// 获胜选项必须存在

        activity.over = true;
        activity.winningChoice = _winningChoice;

        emit ActivityResolved(_activityId, _winningChoice);
    }
    //领取奖励
    function getWins(uint256 _activityId) external {
        Activity storage activity = activities[_activityId];
        Bet storage bet = userBets[_activityId][msg.sender];

        require(_activityId < nextActivityId && activity.owner != address(0), "Activity does not exist");// 活动必须存在
        require(activity.over, "Activity not resolved yet");    // 活动还没结算
        require(bet.amount > 0, "You did not place a bet on this activity");    //未下注
        require(bet.choiceIndex == activity.winningChoice, "Your choice did not win"); // 未获胜
        require(!bet.claimed, "Winnings already claimed");  //已经领取奖励
        require(activity.totalAmount > 0, "No winning bets to pay out from"); // 防止除零错误

        uint256 wins = (bet.amount * activity.totalAmount) / activity.amountsPerChoice[activity.winningChoice];
        require(wins > 0, "Calculated winnings are zero"); //奖励为0应该存在错误

        bet.claimed = true; // 先标记为已领取
        // 发送 ETH
        (bool success, ) = msg.sender.call{value: wins}("");
        require(success, "Transfer failed.");

        emit WinningsClaimed(_activityId, msg.sender, wins);
    }

    // 使用ERC20积分下注
    function PlaceBetWithTokens(uint256 _activityId, uint256 _choice, uint256 _amount) external nonReentrant {
        Activity storage activity = activities[_activityId];
        require(_activityId < nextActivityId && activity.owner != address(0), "Activity does not exist");
        require(activity.over == false, "Activity is over");
        require(block.timestamp < activity.listedTimestamp, "Activity bet time is ended");
        require(_choice < activity.choices.length, "Invalid choice index");
        require(_amount > 0, "Bet amount must be greater than zero");
        require(betToken.balanceOf(msg.sender) >= _amount, "Insufficient token balance");

        // 转账积分
        betToken.transferFrom(msg.sender, address(this), _amount);

        Bet storage bet = userBets[_activityId][msg.sender];
        if (bet.amount > 0) {
            require(bet.choiceIndex == _choice, "Cannot bet on multiple choices in one activity");
            bet.amount += _amount;
        } else {
            bet.choiceIndex = _choice;
            bet.claimed = false;
            bet.amount = _amount;
            activityPlayers[_activityId].push(msg.sender);
        }

        // 更新活动状态
        activities[_activityId].totalAmount += _amount;
        activities[_activityId].amountsPerChoice[_choice] += _amount;

        // 铸造彩票凭证NFT
        uint256 tokenId = lotteryTicket.mint(msg.sender, _activityId, _choice, _amount);

        emit TokenBetPlaced(_activityId, msg.sender, _choice, _amount);
    }

    // 挂牌出售彩票
    function listTicket(uint256 _tokenId, uint256 _price) external {
        require(lotteryTicket.ownerOf(_tokenId) == msg.sender, "Not the owner of this ticket");
        require(!ticketListings[_tokenId].isListed, "Ticket already listed");
        require(_price > 0, "Price must be greater than zero");

        ticketListings[_tokenId] = TicketListing({
            seller: msg.sender,
            price: _price,
            isListed: true
        });

        // 添加到订单簿
        uint256 activityId = lotteryTicket.tokenToActivity(_tokenId);
        uint256 choiceIndex = lotteryTicket.tokenToChoice(_tokenId);
        
        // 这里简化处理，实际应该按价格排序
        activityOrderBooks[activityId].tokenIds.push(_tokenId);
        choiceOrderBooks[activityId][choiceIndex]++;

        emit TicketListed(_tokenId, msg.sender, _price);
    }

    // 取消挂牌
    function delistTicket(uint256 _tokenId) external {
        require(ticketListings[_tokenId].seller == msg.sender, "Not the seller");
        require(ticketListings[_tokenId].isListed, "Ticket not listed");

        ticketListings[_tokenId].isListed = false;

        emit TicketDelisted(_tokenId);
    }

    // 购买彩票
    function buyTicket(uint256 _tokenId) external payable nonReentrant {
        require(ticketListings[_tokenId].isListed, "Ticket not for sale");
        require(msg.value >= ticketListings[_tokenId].price, "Insufficient payment");

        address seller = ticketListings[_tokenId].seller;
        uint256 price = ticketListings[_tokenId].price;

        // 取消挂牌
        ticketListings[_tokenId].isListed = false;

        // 转账彩票
        lotteryTicket.transferFrom(seller, msg.sender, _tokenId);

        // 转账ETH
        (bool success, ) = seller.call{value: price}("");
        require(success, "Transfer failed");

        // 退还多余支付
        if (msg.value > price) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - price}("");
            require(refundSuccess, "Refund failed");
        }

        emit TicketBought(_tokenId, msg.sender, seller, price);
    }

    // 获取订单簿信息
    function getOrderBook(uint256 _activityId, uint256 _choiceIndex) external view returns (uint256[] memory, uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](activityOrderBooks[_activityId].tokenIds.length);
        uint256[] memory prices = new uint256[](activityOrderBooks[_activityId].tokenIds.length);
        
        uint256 count = 0;
        for (uint256 i = 0; i < activityOrderBooks[_activityId].tokenIds.length; i++) {
            uint256 tokenId = activityOrderBooks[_activityId].tokenIds[i];
            if (ticketListings[tokenId].isListed && 
                lotteryTicket.tokenToChoice(tokenId) == _choiceIndex) {
                tokenIds[count] = tokenId;
                prices[count] = ticketListings[tokenId].price;
                count++;
            }
        }
        
        // 调整数组大小
        uint256[] memory resultTokenIds = new uint256[](count);
        uint256[] memory resultPrices = new uint256[](count);
        
        for (uint256 i = 0; i < count; i++) {
            resultTokenIds[i] = tokenIds[i];
            resultPrices[i] = prices[i];
        }
        
        return (resultTokenIds, resultPrices);
    }

    // 领取ERC20积分
    function claimBetTokens() external {
        // 直接调用BetToken的claimTokens函数
        betToken.claimTokens();
    }
    
    // 管理员给用户发放积分
    function mintTokensToUser(address user, uint256 amount) external onlyOwner {
        betToken.mint(user, amount);
    }

}
