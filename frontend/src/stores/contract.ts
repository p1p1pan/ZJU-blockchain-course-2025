import { defineStore } from 'pinia'
import { ref, computed, markRaw } from 'vue'
import { ethers } from 'ethers'

// 声明全局类型
declare global {
  interface Window {
    ethereum?: any
  }
}

export const useContractStore = defineStore('contract', () => {
  // 状态 
  const provider = ref<ethers.BrowserProvider | null>(null)
  const signer = ref<ethers.Signer | null>(null)
  const contract = ref<ethers.Contract | null>(null)
  const userAddress = ref<string>('')
  const isConnected = ref(false)
  const contractAddress = ref('')
  const betTokenBalance = ref<string>("0.00")
  const ownerAddress = ref<string>("")

  // 计算属性 
  const isAdmin = computed(() => ownerAddress.value.toLowerCase() === (userAddress.value || '').toLowerCase())

  // 内部辅助函数 

  // 获取 BetToken 合约实例=
  const getBetTokenContract = async (withSigner = false) => {
    if (!contract.value || !provider.value) throw new Error('合约未加载')
    if (withSigner && !signer.value) throw new Error('签名者未加载')

    const runner = withSigner ? signer.value : provider.value
    if (!runner) throw new Error('Runner (Provider/Signer) 未初始化')

    const betTokenAddress = await (contract.value as any).betToken.staticCall()
    
    const betTokenABI = [
      "function balanceOf(address owner) view returns (uint256)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function approve(address spender, uint256 value) returns (bool)"
    ]
    
    return markRaw(new ethers.Contract(betTokenAddress, betTokenABI, runner as any))
  }

  // 获取 LotteryTicket 合约实例
  const getLotteryTicketContract = async (withSigner = false) => {
    if (!contract.value || !provider.value) throw new Error('合约未加载');
    if (withSigner && !signer.value) throw new Error('签名者未加载');
    
    const runner = withSigner ? signer.value : provider.value;
    const lotteryTicketAddress = await (contract.value as any).lotteryTicket.staticCall();
  
    const ticketABI = [
      "function balanceOf(address owner) view returns (uint256)",
      "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
      "function getApproved(uint256 tokenId) view returns (address)",
      "function approve(address to, uint256 tokenId) returns (bool)",
      "function tokenToActivity(uint256 tokenId) view returns (uint256)",
      "function tokenToChoice(uint256 tokenId) view returns (uint256)",
      "function tokenToAmount(uint256 tokenId) view returns (uint256)"
    ];
  
    return markRaw(new ethers.Contract(lotteryTicketAddress, ticketABI, runner as any));
  }

  // 确保 BET 授权额度足够
  const ensureBetTokenAllowance = async (requiredWei: bigint) => {
    if (!userAddress.value || !contractAddress.value) throw new Error('缺少地址')
    
    const betToken = await getBetTokenContract(false)
    const current = await (betToken as any).allowance(userAddress.value, contractAddress.value)
    
    if (current < requiredWei) {
      const betTokenWithSigner = await getBetTokenContract(true)
      const tx = await (betTokenWithSigner as any).approve(contractAddress.value, requiredWei)
      await tx.wait()
    }
  }

  // 确保 LotteryTicket 授权
  const ensureTicketApproval = async (tokenId: number) => {
    if (!userAddress.value || !contractAddress.value) throw new Error('缺少地址');
    
    const ticketContract = await getLotteryTicketContract(false);
    const approvedAddress = await (ticketContract as any).getApproved(tokenId);
  
    if (approvedAddress.toLowerCase() !== contractAddress.value.toLowerCase()) {
      const ticketWithSigner = await getLotteryTicketContract(true);
      const tx = await (ticketWithSigner as any).approve(contractAddress.value, tokenId);
      await tx.wait();
    }
  }
  
  // 获取带签名者的主合约实例
  const getContractWithSigner = () => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }
    // 直接返回 contract.value，因为它在 loadContract 时就已经连接了 signer
    return contract.value as any
  }

  // 钱包
  // 连接钱包
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        })

        if (accounts.length > 0) {
          userAddress.value = accounts[0]
          isConnected.value = true

          const ethProvider = new ethers.BrowserProvider(window.ethereum)
          provider.value = markRaw(ethProvider)
          
          const ethSigner = await ethProvider.getSigner()
          signer.value = markRaw(ethSigner)

          const network = await ethProvider.getNetwork()
          console.log('Connected to network:', network.name, network.chainId)
          return true
        }
      } else {
        alert('请安装MetaMask钱包')
        return false
      }
    } catch (error) {
      console.error('连接钱包失败:', error)
      alert('连接钱包失败')
      return false
    }
  }

  // 加载合约
  const loadContract = async (address: string, abi: any) => {
    if (!signer.value) {
      throw new Error('请先连接钱包')
    }
    try {
      // 直接使用 signer.value 初始化合约，使其可读可写
      contract.value = markRaw(new ethers.Contract(address, abi, signer.value))
      contractAddress.value = address
      console.log('合约加载成功 (已连接签名者):', address)
      
      // 加载所有者地址
      try {
        ownerAddress.value = await (contract.value as any).owner.staticCall()
        console.log('合约所有者:', ownerAddress.value)
      } catch (e) {
        console.warn('获取合约所有者失败:', e)
      }
    } catch (error) {
      console.error('加载合约失败:', error)
      throw error
    }
  }

  // 断开钱包
  const disconnectWallet = () => {
    provider.value = null
    signer.value = null
    contract.value = null
    userAddress.value = ''
    isConnected.value = false
    contractAddress.value = ''
  }

  // ERC20 (BetToken)
  // 获取积分余额
  const getBetTokenBalance = async (userAddress: string) => {
    if (!contract.value || !provider.value) {
      throw new Error('合约未加载');
    }
    try {
      const betTokenContract = await getBetTokenContract(false); // false = 只读
      const balance = await betTokenContract.balanceOf(userAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('获取积分余额失败:', error);
      return "0.00";
    }
  }
  
  // 加载积分余额
  const loadBetTokenBalance = async () => {
    if (isConnected.value && userAddress.value) {
      try {
        const balance = await getBetTokenBalance(userAddress.value);
        betTokenBalance.value = parseFloat(balance).toFixed(2);
      } catch (error) {
        console.error('获取积分余额失败:', error);
        betTokenBalance.value = "0.00";
      }
    }
  }

  // 领取积分
  const claimBetTokens = async () => {
    if (!contract.value) throw new Error('合约未加载')
    try {
      const contractWithSigner = getContractWithSigner()
      const tx = await contractWithSigner.claimBetTokens()
      await tx.wait()
      await loadBetTokenBalance() // 成功后刷新余额
      return tx.hash
    } catch (error) {
      console.error('领取积分失败:', error)
      throw error
    }
  }
  
  // 管理员

  // 创建活动
  const createActivity = async (activityData: any) => {
    if (!contract.value) throw new Error('合约未加载')
    try {
      const deadline = Math.floor(new Date(activityData.deadline).getTime() / 1000)
      const initialWei = ethers.parseEther(activityData.prizePool.toString())
      
      await ensureBetTokenAllowance(initialWei)

      const contractWithSigner = getContractWithSigner()
      const tx = await (contractWithSigner as any).CreateActivity(
        activityData.description,
        activityData.choices,
        deadline,
        initialWei
      )
      
      await tx.wait()
      await loadBetTokenBalance() // 管理员余额减少，刷新
      return tx.hash
    } catch (error) {
      console.error('创建活动失败:', error)
      throw error
    }
  }
  
  // 提前结束活动
  const endBettingEarly = async (activityId: number) => {
    if (!contract.value) throw new Error('合约未加载');
    try {
      const contractWithSigner = getContractWithSigner();
      const tx = await contractWithSigner.endBettingEarly(activityId);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('提前结束活动失败:', error);
      throw error;
    }
  }

  // 结算活动
  const resolveActivity = async (activityId: number, winningChoice: number) => {
    if (!contract.value) throw new Error('合约未加载')
    try {
      const contractWithSigner = getContractWithSigner()
      const tx = await contractWithSigner.ResolveActivity(activityId, winningChoice)
      await tx.wait()
      // 结算不会改变余额，但可能触发其他逻辑，可选择性刷新
      // await loadBetTokenBalance() 
      return tx.hash
    } catch (error) {
      console.error('结算活动失败:', error)
      throw error
    }
  }
  
  // 转移所有权
  const transferOwnership = async (newOwner: string) => {
    if (!contract.value) throw new Error('合约未加载')
    const contractWithSigner = getContractWithSigner()
    const tx = await (contractWithSigner as any).transferOwnership(newOwner)
    await tx.wait()
    ownerAddress.value = newOwner
    return tx.hash
  }


  // 投注
  // 积分下注
  const placeBet = async (activityId: number, choiceIndex: number, amount: number) => {
    if (!contract.value) throw new Error('合约未加载')
    try {
      const amountWei = ethers.parseEther(amount.toString())
      await ensureBetTokenAllowance(amountWei)
      
      const contractWithSigner = getContractWithSigner()
      const tx = await (contractWithSigner as any).Placebet(
        activityId,
        choiceIndex,
        amountWei
      )
      
      await tx.wait()
      await loadBetTokenBalance() // 余额改变，刷新
      return tx.hash
    } catch (error) {
      console.error('下注失败:', error)
      throw error
    }
  }

  // 领取奖励
  const getWins = async (tokenId: number) => {
    if (!contract.value) throw new Error('合约未加载')
    try {
      const contractWithSigner = getContractWithSigner()
      const tx = await contractWithSigner.getWins(tokenId) 
      await tx.wait()
      await loadBetTokenBalance() // 余额改变，刷新
      return tx.hash
    } catch (error) {
      console.error('领取奖励失败:', error)
      throw error
    }
  }

  // 交易市场

  // 挂单
  const listTicket = async (tokenId: number, price: number) => {
    if (!contract.value) throw new Error('合约未加载')
    try {
      await ensureTicketApproval(tokenId);
      const contractWithSigner = getContractWithSigner()
      const tx = await contractWithSigner.listTicket(
        tokenId,
        ethers.parseEther(price.toString())
      )
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error('挂单失败:', error)
      throw error
    }
  }

  // 取消挂单
  const delistTicket = async (tokenId: number) => {
    if (!contract.value) throw new Error('合约未加载')
    try {
      const contractWithSigner = getContractWithSigner()
      const tx = await contractWithSigner.delistTicket(tokenId)
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error('取消挂单失败:', error)
      throw error
    }
  }

  // 购买彩票
  const buyTicket = async (tokenId: number, price: number) => {
    if (!contract.value) throw new Error('合约未加载')
    try {
      const priceWei = ethers.parseEther(price.toString())
      await ensureBetTokenAllowance(priceWei) // 买家授权积分

      const contractWithSigner = getContractWithSigner()
      const tx = await contractWithSigner.buyTicket(tokenId)
      
      await tx.wait()
      await loadBetTokenBalance() // 余额改变，刷新
      return tx.hash
    } catch (error) {
      console.error('购买彩票失败:', error)
      throw error
    }
  }
  

  // Getters
  // 获取活动信息
  const getActivity = async (activityId: number) => {
    if (!contract.value) throw new Error('合约未加载')
    try {
      const activityData = await (contract.value as any).getActivityDetails.staticCall(activityId);
      return {
        owner: activityData[0],
        listedTimestamp: activityData[1],
        choices: activityData[2],
        description: activityData[3],
        over: activityData[4],
        winningChoice: activityData[5],
        totalAmount: activityData[6],
        soldTickets: activityData[7] 
      };
    } catch (error) {
      console.error('获取活动信息失败:', error)
      throw error
    }
  }
  
  // 获取活动选项
  const getActivityChoices = async (activityId: number) => {
    if (!contract.value) throw new Error('合约未加载')
    try {
      const choices = await (contract.value as any).getActivityChoices.staticCall(activityId)
      return choices
    } catch (error) {
      console.error('获取活动选项失败:', error)
      throw error
    }
  }

  // 获取选项投注金额
  const getAmountsPerChoice = async (activityId: number, choiceIndex: number) => {
    if (!contract.value) throw new Error('合约未加载')
    try {
      const amount = await (contract.value as any).getAmountsPerChoice.staticCall(activityId, choiceIndex)
      return amount
    } catch (error) {
      console.error('获取选项投注金额失败:', error)
      throw error
    }
  }

  // 获取下一个活动ID
  const getNextActivityId = async () => {
    if (!contract.value) throw new Error('合约未加载')
    try {
      const nextId = await contract.value.nextActivityId.staticCall()
      return Number(nextId)
    } catch (error) {
      console.error('获取活动数量失败:', error)
      throw error
    }
  }
  
  // 获取用户彩票信息
  const getTicketsInfoByUser = async (userAddress: string) => {
    if (!contract.value) throw new Error('合约未加载');
    try {
      const ticketsInfo = await (contract.value as any).getTicketsInfoByUser.staticCall(userAddress);
      return ticketsInfo;
    } catch (error) {
      console.error('获取用户彩票信息失败:', error);
      throw error;
    }
  }

  // 获取订单簿信息
  const getOrderBook = async (activityId: number, choiceIndex: number) => {
    if (!contract.value) throw new Error('合约未加载')
    try {
      const orderBook = await contract.value.getOrderBook.staticCall(activityId, choiceIndex)
      return orderBook
    } catch (error) {
      console.error('获取订单簿失败:', error)
      throw error
    }
  }

  // 获取彩票挂牌信息
  const getTicketListing = async (tokenId: number) => {
    if (!contract.value) throw new Error('合约未加载')
    try {
      const listing = await contract.value.ticketListings.staticCall(tokenId)
      return listing
    } catch (error) {
      console.error('获取彩票挂牌信息失败:', error)
      throw error
    }
  }
  



  return {
    // 状态
    provider,
    signer,
    contract,
    userAddress,
    isConnected,
    contractAddress,
    betTokenBalance,
    
    // 计算属性
    isAdmin,
    
    // 动作
    connectWallet,
    loadContract,
    loadBetTokenBalance,
    disconnectWallet,
    createActivity,
    placeBet,
    listTicket,
    delistTicket,
    buyTicket,
    endBettingEarly,
    resolveActivity,
    getWins,
    claimBetTokens,
    getActivity,
    getTicketsInfoByUser,
    getLotteryTicketContract, 
    getActivityChoices,
    getAmountsPerChoice,
    getNextActivityId,
    getOrderBook,
    getTicketListing,
    getBetTokenBalance
  }
})