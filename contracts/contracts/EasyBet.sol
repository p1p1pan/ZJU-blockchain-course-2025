// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ERC20积分合约
contract BetToken is ERC20, Ownable {
    constructor() ERC20("BetToken", "BET") Ownable(msg.sender) {}

    // 用户领取积分
    function claimTokens() external {
        _mint(msg.sender, 10000 * 10**18); // 每次领取10000个积分
    }

    // 管理员铸造积分
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

// ERC721彩票凭证合约
contract LotteryTicket is ERC721Enumerable, Ownable {
    uint256 private _nextTokenId;
    mapping(uint256 => uint256) public tokenToActivity; // tokenId -> activityId
    mapping(uint256 => uint256) public tokenToChoice; // tokenId -> choiceIndex
    mapping(uint256 => uint256) public tokenToAmount; // tokenId -> betAmount

    constructor() ERC721("LotteryTicket", "LOT") Ownable(msg.sender) {
        _nextTokenId = 1; // Token ID 从 1 开始
    }

    function mint(
        address to,
        uint256 activityId,
        uint256 choiceIndex,
        uint256 amount
    ) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        tokenToActivity[tokenId] = activityId;
        tokenToChoice[tokenId] = choiceIndex;
        tokenToAmount[tokenId] = amount;
        return tokenId;
    }
}

contract EasyBet is Ownable, ReentrancyGuard {
    // 事件 
    event activityCreated(
        uint256 indexed activityId,
        address indexed creator,
        string description,
        uint256 listedTimestamp
    );
    event BetPlaced(
        uint256 indexed activityId,
        address indexed player,
        uint256 choiceIndex,
        uint256 amount
    );
    event ActivityResolved(
        uint256 indexed activityId,
        uint256 winningChoiceIndex
    );
    event WinningsClaimed(
        uint256 indexed activityId,
        address indexed player,
        uint256 amount
    );
    event TicketListed(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 price
    );
    event TicketDelisted(uint256 indexed tokenId);
    event TicketBought(
        uint256 indexed tokenId,
        address indexed buyer,
        address indexed seller,
        uint256 price
    );
    event TokenBetPlaced(
        uint256 indexed activityId,
        address indexed player,
        uint256 choiceIndex,
        uint256 amount
    );
    event ActivityBettingEnded(uint256 indexed activityId, uint256 endTime);

    // 结构体
    // 活动结构体
    struct Activity {
        address owner; // 创建者
        uint256 listedTimestamp; // 截止时间
        string[] choices; // 选项(需大于等于二)
        string description; // 活动描述
        bool over; // 是否结束
        uint256 winningChoice; // 正确选项
        uint256 totalAmount; // 奖池总金额
        uint256 soldTickets; // 已售出的彩票数量
        mapping(uint256 => uint256) amountsPerChoice; // 每个选项的总投注金额
    }

    // 彩票挂牌结构体
    struct TicketListing {
        address seller; // 卖家地址
        uint256 price; // 挂牌价格
        bool isListed; // 是否挂牌
    }

    // 用于前端一次性获取彩票信息
    struct UserTicketInfo {
        uint256 tokenId; // 彩票ID
        uint256 activityId; // 活动ID
        uint256 choiceIndex; // 选项索引
        uint256 purchaseAmount; // 购买金额
        bool isListed; // 是否挂牌
        uint256 salePrice; // 挂牌价格
        bool activityOver; // 活动是否结束
        uint256 winningChoice; // 获胜选项
        bool claimed; // 是否已领取奖励
    }

    // 订单簿结构
    struct OrderBook {
        uint256[] tokenIds; // tokenId列表
    }

    // 状态变量
    uint256 public nextActivityId; // 下一个活动id
    mapping(uint256 => Activity) public activities; // A map from activity-index to its information
    mapping(uint256 => bool) public ticketClaimed; // 彩票是否已领取奖励

    // 合约实例
    BetToken public betToken;
    LotteryTicket public lotteryTicket;

    // 彩票交易相关映射
    mapping(uint256 => TicketListing) public ticketListings; // tokenId -> 挂牌信息
    mapping(uint256 => OrderBook) activityOrderBooks; // activityId -> 订单簿
    mapping(uint256 => mapping(uint256 => uint256)) public choiceOrderBooks; // activityId -> choiceIndex -> 订单簿

    //--- 函数 ---
    constructor(address _betTokenAddress, address _lotteryTicketAddress)
        Ownable(msg.sender)
    {
        nextActivityId = 0;

        require(
            _betTokenAddress != address(0),
            "Invalid BetToken address"
        );
        require(
            _lotteryTicketAddress != address(0),
            "Invalid LotteryTicket address"
        );

        betToken = BetToken(_betTokenAddress);
        lotteryTicket = LotteryTicket(_lotteryTicketAddress);
    }

    // 创建活动
    function CreateActivity(
        string memory _description,
        string[] memory _choices,
        uint256 _listedTimerstamp,
        uint256 _initialAmount
    ) external onlyOwner {
        require(_choices.length >= 2, "must have choice more than 1");
        require(
            _listedTimerstamp > block.timestamp,
            "stop time must later then now"
        );
        require(_initialAmount > 0, "Initial pot should be provided");

        uint256 newActivityId = nextActivityId++;
        Activity storage newActivity = activities[newActivityId];
        newActivity.owner = msg.sender;
        newActivity.description = _description;
        newActivity.choices = _choices;
        newActivity.listedTimestamp = _listedTimerstamp;
        newActivity.over = false;
        newActivity.soldTickets = 0;
        newActivity.totalAmount = _initialAmount;

        // 从活动创建者转入初始积分到奖池
        betToken.transferFrom(msg.sender, address(this), _initialAmount);

        emit activityCreated(
            newActivityId,
            msg.sender,
            _description,
            _listedTimerstamp
        );
    }

    // 积分下注
    function Placebet(
        uint256 _activityId,
        uint256 _choice,
        uint256 _amount
    ) public nonReentrant {
        Activity storage activity = activities[_activityId];
        require(
            _activityId < nextActivityId && activity.owner != address(0),
            "Activity does not exist"
        );
        require(activity.over == false, "Activity is over");
        require(
            block.timestamp < activity.listedTimestamp,
            "Activity bet time is ended"
        );
        require(_choice < activity.choices.length, "Invalid choice index");
        require(_amount > 0, "Bet amount must be greater than zero");

        // 1. 转入积分
        betToken.transferFrom(msg.sender, address(this), _amount);

        // 2. 更新活动状态
        activities[_activityId].soldTickets++;
        activities[_activityId].totalAmount += _amount;
        activities[_activityId].amountsPerChoice[_choice] += _amount;

        // 3. 铸造 NFT 彩票
        uint256 tokenId = lotteryTicket.mint(
            msg.sender,
            _activityId,
            _choice,
            _amount
        );

        // 4. 触发事件
        emit BetPlaced(_activityId, msg.sender, _choice, _amount);
    }

    // 提前结束活动
    function endBettingEarly(uint256 _activityId) external onlyOwner {
        Activity storage activity = activities[_activityId];
        require(
            _activityId < nextActivityId && activity.owner != address(0),
            "Activity does not exist"
        );
        require(!activity.over, "Activity already resolved");
        require(
            block.timestamp < activity.listedTimestamp,
            "Betting period already ended"
        );

        activity.listedTimestamp = block.timestamp;

        emit ActivityBettingEnded(_activityId, block.timestamp);
    }

    // 结算活动
    function ResolveActivity(uint256 _activityId, uint256 _winningChoice)
        external
        onlyOwner
    {
        Activity storage activity = activities[_activityId];
        require(
            _activityId < nextActivityId && activity.owner != address(0),
            "Activity does not exist"
        );
        require(!activity.over, "Activity already resolved");
        require(
            _winningChoice < activity.choices.length,
            "Invalid winning choice index"
        );

        activity.over = true;
        activity.winningChoice = _winningChoice;

        emit ActivityResolved(_activityId, _winningChoice);
    }

    // 领取奖励
    function getWins(uint256 _tokenId) external nonReentrant {
        // 1. 检查 NFT 所有权和状态
        require(
            lotteryTicket.ownerOf(_tokenId) == msg.sender,
            "You are not the owner of this ticket"
        );
        require(
            !ticketClaimed[_tokenId],
            "This ticket has already been claimed"
        );

        // 2. 获取彩票和活动信息
        uint256 activityId = lotteryTicket.tokenToActivity(_tokenId);
        uint256 choiceIndex = lotteryTicket.tokenToChoice(_tokenId);
        uint256 betAmount = lotteryTicket.tokenToAmount(_tokenId);
        Activity storage activity = activities[activityId];

        // 3. 检查活动是否已结算且中奖
        require(activity.over, "Activity not resolved yet");
        require(choiceIndex == activity.winningChoice, "Your choice did not win");

        // 4. 检查奖池
        uint256 totalWinningAmount = activity.amountsPerChoice[
            activity.winningChoice
        ];
        require(totalWinningAmount > 0, "No winning bets to pay out from");

        // 5. 计算奖金
        uint256 wins = (betAmount * activity.totalAmount) / totalWinningAmount;
        require(wins > 0, "Calculated winnings are zero");

        // 6. 标记为已领取并发放奖励
        ticketClaimed[_tokenId] = true;
        betToken.transfer(msg.sender, wins);

        emit WinningsClaimed(activityId, msg.sender, wins);
    }

    // 积分下注
    function PlaceBetWithTokens(
        uint256 _activityId,
        uint256 _choice,
        uint256 _amount
    ) external nonReentrant {
        Placebet(_activityId, _choice, _amount);
    }

    // 挂牌出售彩票
    function listTicket(uint256 _tokenId, uint256 _price) external {
        require(
            lotteryTicket.ownerOf(_tokenId) == msg.sender,
            "Not the owner of this ticket"
        );
        require(!ticketListings[_tokenId].isListed, "Ticket already listed");
        require(_price > 0, "Price must be greater than zero");

        uint256 activityId = lotteryTicket.tokenToActivity(_tokenId);
        Activity storage activity = activities[activityId];
        require(!activity.over, "Activity is already resolved");

        ticketListings[_tokenId] = TicketListing({
            seller: msg.sender,
            price: _price,
            isListed: true
        });

        // 添加到订单簿
        uint256 choiceIndex = lotteryTicket.tokenToChoice(_tokenId);
        activityOrderBooks[activityId].tokenIds.push(_tokenId);
        choiceOrderBooks[activityId][choiceIndex]++;

        emit TicketListed(_tokenId, msg.sender, _price);
    }

    // 取消挂牌
    function delistTicket(uint256 _tokenId) external {
        require(
            ticketListings[_tokenId].seller == msg.sender,
            "Not the seller"
        );
        require(ticketListings[_tokenId].isListed, "Ticket not listed");

        ticketListings[_tokenId].isListed = false;

        emit TicketDelisted(_tokenId);
    }

    // 购买彩票
    function buyTicket(uint256 _tokenId) external nonReentrant {
        require(ticketListings[_tokenId].isListed, "Ticket not for sale");

        uint256 activityId = lotteryTicket.tokenToActivity(_tokenId);
        Activity storage activity = activities[activityId];
        require(!activity.over, "Activity is already resolved");

        address seller = ticketListings[_tokenId].seller;
        uint256 price = ticketListings[_tokenId].price;

        // 先收款（需要买家提前 approve）
        betToken.transferFrom(msg.sender, seller, price);

        // 取消挂牌
        ticketListings[_tokenId].isListed = false;

        // 转移彩票
        lotteryTicket.transferFrom(seller, msg.sender, _tokenId);

        emit TicketBought(_tokenId, msg.sender, seller, price);
    }


    // 获取订单簿信息
    function getOrderBook(
        uint256 _activityId,
        uint256 _choiceIndex
    ) external view returns (uint256[] memory, uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](
            activityOrderBooks[_activityId].tokenIds.length
        );
        uint256[] memory prices = new uint256[](
            activityOrderBooks[_activityId].tokenIds.length
        );

        uint256 count = 0;
        for (
            uint256 i = 0;
            i < activityOrderBooks[_activityId].tokenIds.length;
            i++
        ) {
            uint256 tokenId = activityOrderBooks[_activityId].tokenIds[i];
            if (
                ticketListings[tokenId].isListed &&
                lotteryTicket.tokenToChoice(tokenId) == _choiceIndex
            ) {
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
        // 本合约是 BetToken 的 owner，可以直接 mint
        uint256 amount = 1000 * 10**18;
        betToken.mint(msg.sender, amount);
    }

    // 管理员给用户发放积分
    function mintTokensToUser(address user, uint256 amount) external onlyOwner {
        betToken.mint(user, amount);
    }

    // 获取活动的选项列表
    function getActivityChoices(uint256 _activityId)
        external
        view
        returns (string[] memory)
    {
        return activities[_activityId].choices;
    }

    // 获取活动的选项数量
    function getActivityChoicesLength(uint256 _activityId)
        external
        view
        returns (uint256)
    {
        return activities[_activityId].choices.length;
    }

    // 获取某个选项的总投注金额
    function getAmountsPerChoice(
        uint256 _activityId,
        uint256 _choiceIndex
    ) external view returns (uint256) {
        return activities[_activityId].amountsPerChoice[_choiceIndex];
    }

    // 获取活动详情
    function getActivityDetails(uint256 _activityId)
        external
        view
        returns (
            address owner,
            uint256 listedTimestamp,
            string[] memory choices,
            string memory description,
            bool over,
            uint256 winningChoice,
            uint256 totalAmount,
            uint256 soldTickets
        )
    {
        Activity storage activity = activities[_activityId];
        return (
            activity.owner,
            activity.listedTimestamp,
            activity.choices,
            activity.description,
            activity.over,
            activity.winningChoice,
            activity.totalAmount,
            activity.soldTickets
        );
    }

    // 获取用户持有的所有彩票信息
    function getTicketsInfoByUser(address user)
        external
        view
        returns (UserTicketInfo[] memory)
    {
        uint256 balance = lotteryTicket.balanceOf(user);
        UserTicketInfo[] memory infos = new UserTicketInfo[](balance);

        for (uint i = 0; i < balance; i++) {
            uint256 tokenId = lotteryTicket.tokenOfOwnerByIndex(user, i);
            uint256 activityId = lotteryTicket.tokenToActivity(tokenId);
            uint256 choiceIndex = lotteryTicket.tokenToChoice(tokenId);
            uint256 purchaseAmount = lotteryTicket.tokenToAmount(tokenId);

            Activity storage activity = activities[activityId];
            TicketListing storage listing = ticketListings[tokenId];

            infos[i] = UserTicketInfo({
                tokenId: tokenId,
                activityId: activityId,
                choiceIndex: choiceIndex,
                purchaseAmount: purchaseAmount,
                isListed: listing.isListed,
                salePrice: listing.isListed ? listing.price : 0,
                activityOver: activity.over,
                winningChoice: activity.winningChoice,
                claimed: ticketClaimed[tokenId]
            });
        }
        return infos;
    }
}