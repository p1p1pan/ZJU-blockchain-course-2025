import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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

  // 计算属性
  const isAdmin = computed(() => {
    // 这里应该检查用户是否为管理员
    // 实际实现需要从合约获取管理员地址
    return false
  })

  // 动作
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        // 请求用户连接钱包
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        })

        if (accounts.length > 0) {
          // 创建provider和signer
          provider.value = new ethers.BrowserProvider(window.ethereum)
          signer.value = await provider.value.getSigner()
          userAddress.value = accounts[0]
          isConnected.value = true

          // 获取网络信息
          const network = await provider.value.getNetwork()
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

  const loadContract = async (address: string, abi: any) => {
    if (!signer.value) {
      throw new Error('请先连接钱包')
    }

    try {
      contract.value = new ethers.Contract(address, abi, signer.value)
      contractAddress.value = address
      console.log('合约加载成功:', address)
    } catch (error) {
      console.error('加载合约失败:', error)
      throw error
    }
  }

  const disconnectWallet = () => {
    provider.value = null
    signer.value = null
    contract.value = null
    userAddress.value = ''
    isConnected.value = false
    contractAddress.value = ''
  }

  // 合约交互方法
  const createActivity = async (activityData: any) => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }

    try {
      // 将截止时间转换为时间戳
      const deadline = Math.floor(new Date(activityData.deadline).getTime() / 1000)
      
      const tx = await contract.value.CreateActivity(
        activityData.description,
        activityData.choices,
        deadline,
        { value: ethers.parseEther(activityData.prizePool.toString()) }
      )
      
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error('创建活动失败:', error)
      throw error
    }
  }

  const placeBet = async (activityId: number, choiceIndex: number, amount: number) => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }

    try {
      const tx = await contract.value.Placebet(
        activityId,
        choiceIndex,
        { value: ethers.parseEther(amount.toString()) }
      )
      
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error('下注失败:', error)
      throw error
    }
  }

  const placeBetWithTokens = async (activityId: number, choiceIndex: number, amount: number) => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }

    try {
      const tx = await contract.value.PlaceBetWithTokens(
        activityId,
        choiceIndex,
        ethers.parseEther(amount.toString())
      )
      
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error('积分下注失败:', error)
      throw error
    }
  }

  const listTicket = async (tokenId: number, price: number) => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }

    try {
      const tx = await contract.value.listTicket(
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

  const delistTicket = async (tokenId: number) => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }

    try {
      const tx = await contract.value.delistTicket(tokenId)
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error('取消挂单失败:', error)
      throw error
    }
  }

  const buyTicket = async (tokenId: number, price: number) => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }

    try {
      const tx = await contract.value.buyTicket(
        tokenId,
        { value: ethers.parseEther(price.toString()) }
      )
      
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error('购买彩票失败:', error)
      throw error
    }
  }

  const resolveActivity = async (activityId: number, winningChoice: number) => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }

    try {
      const tx = await contract.value.ResolveActivity(activityId, winningChoice)
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error('结算活动失败:', error)
      throw error
    }
  }

  const getWins = async (activityId: number) => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }

    try {
      const tx = await contract.value.getWins(activityId)
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error('领取奖励失败:', error)
      throw error
    }
  }

  const claimBetTokens = async () => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }

    try {
      const tx = await contract.value.claimBetTokens()
      await tx.wait()
      return tx.hash
    } catch (error) {
      console.error('领取积分失败:', error)
      throw error
    }
  }

  const getActivity = async (activityId: number) => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }

    try {
      const activity = await contract.value.activities(activityId)
      return activity
    } catch (error) {
      console.error('获取活动信息失败:', error)
      throw error
    }
  }

  const getNextActivityId = async () => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }

    try {
      const nextId = await contract.value.nextActivityId()
      return Number(nextId)
    } catch (error) {
      console.error('获取活动数量失败:', error)
      throw error
    }
  }

  const getUserBet = async (activityId: number, userAddress: string) => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }

    try {
      const bet = await contract.value.userBets(activityId, userAddress)
      return bet
    } catch (error) {
      console.error('获取用户投注信息失败:', error)
      throw error
    }
  }

  const getOrderBook = async (activityId: number, choiceIndex: number) => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }

    try {
      const orderBook = await contract.value.getOrderBook(activityId, choiceIndex)
      return orderBook
    } catch (error) {
      console.error('获取订单簿失败:', error)
      throw error
    }
  }

  const getTicketListing = async (tokenId: number) => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }

    try {
      const listing = await contract.value.ticketListings(tokenId)
      return listing
    } catch (error) {
      console.error('获取彩票挂牌信息失败:', error)
      throw error
    }
  }

  const getBetTokenBalance = async (userAddress: string) => {
    if (!contract.value) {
      throw new Error('合约未加载')
    }

    try {
      const betToken = await contract.value.betToken()
      const balance = await betToken.balanceOf(userAddress)
      return ethers.formatEther(balance)
    } catch (error) {
      console.error('获取积分余额失败:', error)
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
    
    // 计算属性
    isAdmin,
    
    // 动作
    connectWallet,
    loadContract,
    disconnectWallet,
    createActivity,
    placeBet,
    placeBetWithTokens,
    listTicket,
    delistTicket,
    buyTicket,
    resolveActivity,
    getWins,
    claimBetTokens,
    getActivity,
    getNextActivityId,
    getUserBet,
    getOrderBook,
    getTicketListing,
    getBetTokenBalance
  }
})
