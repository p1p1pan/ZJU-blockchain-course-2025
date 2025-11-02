<template>
  <div class="my-tickets">
    <div class="page-header">
      <h1>我的彩票</h1>
      <p>管理您的彩票，查看交易记录</p>
    </div>

    <div class="tabs">
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'owned' }"
        @click="activeTab = 'owned'"
      >
        我的彩票
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'market' }"
        @click="activeTab = 'market'"
      >
        交易市场
      </button>
    </div>

    <div v-if="activeTab === 'owned'" class="tab-content">
      <div v-if="loading" class="loading-state">
        <p>正在加载彩票...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <button @click="loadMyTickets" class="btn btn-primary">重试</button>
      </div>

      <div v-else-if="!isConnected" class="empty-state">
        <p>请先连接钱包</p>
      </div>

      <div v-else-if="myTickets.length === 0" class="empty-state">
        <p>您还没有购买任何彩票</p>
        <router-link to="/activities" class="btn btn-primary">去购买彩票</router-link>
      </div>
      
      <div v-else> 
        <div class="ticket-filters">
          <button 
            class="tab-button" 
            :class="{ active: ticketFilter === 'all' }"
            @click="ticketFilter = 'all'"
          >
            全部彩票
          </button>
          <button 
            class="tab-button" 
            :class="{ active: ticketFilter === 'active' }"
            @click="ticketFilter = 'active'"
          >
            进行中 / 挂单
          </button>
          <button 
            class="tab-button" 
            :class="{ active: ticketFilter === 'won' }"
            @click="ticketFilter = 'won'"
          >
            已中奖
          </button>
          <button 
            class="tab-button" 
            :class="{ active: ticketFilter === 'lost' }"
            @click="ticketFilter = 'lost'"
          >
            未中奖
          </button>
        </div>

        <div v-if="filteredMyTickets.length === 0" class="empty-state">
          <p>在当前筛选条件下没有彩票</p>
        </div>

        <div v-else class="tickets-grid">
          <div v-for="ticket in filteredMyTickets" :key="ticket.id" class="ticket-card">
            
            <div class="ticket-header">
              <h3>{{ ticket.activityTitle }}</h3>
              <span class="ticket-status" :class="ticket.status">
                {{ getStatusText(ticket.status) }}
              </span>
            </div>
            
            <div class="ticket-info">
              <div class="info-row">
                <span class="label">选择：</span>
                <span class="value">{{ ticket.choiceName }}</span>
              </div>
              <div class="info-row">
                <span class="label">购买价格：</span>
                <span class="value">{{ ticket.purchasePrice }} BET</span>
              </div>
              <div class="info-row">
                <span class="label">Token ID：</span>
                <span class="value">#{{ ticket.tokenId }}</span>
              </div>
            </div>

            <div class="ticket-actions">
              <button 
                v-if="ticket.status === 'active'"
                class="btn btn-primary"
                @click="listForSale(ticket)"  
                :disabled="loading || !isConnected" 
              >
                {{ loading ? '处理中...' : '挂单出售' }}
              </button>

              <button 
                v-if="ticket.status === 'listed'"
                class="btn btn-danger" 
                @click="cancelListing(ticket)"
                :disabled="loading || !isConnected"
              >
                {{ loading ? '处理中...' : '取消挂售' }}
              </button>
              
              <button 
                v-if="ticket.status === 'won'"
                class="btn btn-success"
                @click="claimReward(ticket)"
                :disabled="loading || !isConnected"
              >
                {{ loading ? '处理中...' : '领取奖励' }}
              </button>
            </div>
            </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'market'" class="tab-content">
      <div class="market-filters">
        <select v-model="selectedActivity" class="form-input">
          <option value="">所有活动</option>
          <option v-for="activity in activities" :key="activity.id" :value="activity.id">
            {{ activity.title }}
          </option>
        </select>
      </div>

      <div v-if="!isConnected" class="empty-state">
        <p>请先连接钱包</p>
      </div>

      <div v-else-if="marketTickets.length === 0" class="empty-state">
        <p>当前没有可交易的彩票</p>
      </div>
      
      <div v-else class="tickets-grid">
        <div v-for="ticket in filteredMarketTicketsInternal" :key="ticket.id" class="ticket-card">
          <div class="ticket-header">
            <h3>{{ ticket.activityTitle }}</h3>
            <span class="price-tag">{{ ticket.salePrice }} BET</span>
          </div>
          
          <div class="ticket-info">
            <div class="info-row">
              <span class="label">选择：</span>
              <span class="value">{{ ticket.choiceName }}</span>
            </div>
            <div class="info-row">
              <span class="label">原购买价：</span>
              <span class="value">{{ ticket.purchasePrice }} BET</span>
            </div>
            <div class="info-row">
              <span class="label">卖家：</span>
              <span class="value">{{ formatAddress(ticket.seller || '') }}</span>
            </div>
          </div>

          <div class="ticket-actions">
            <button 
              class="btn btn-success" 
              @click="buyFromMarket(ticket)"
              :disabled="loading || !isConnected"
            >
              {{ loading ? '处理中...' : '购买' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showSellModal" class="modal-overlay" @click="closeSellModal">
      <div class="modal" @click.stop>
        <h3>挂单出售</h3>
        <div class="form-group">
          <label class="form-label">出售价格 (BET)：</label>
          <input 
            v-model="sellPrice" 
            type="number" 
            class="form-input" 
            step="0.001"
            min="0.001"
          />
        </div>
        <div class="modal-actions">
          <button 
            class="btn btn-primary" 
            @click="confirmSell"
            :disabled="loading"
          >
            {{ loading ? '处理中...' : '确认挂单' }}
          </button>
          <button 
            class="btn" 
            @click="closeSellModal"
            :disabled="loading"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useContractStore } from '@/stores/contract'
import { ethers } from 'ethers';

// Store和状态
const contractStore = useContractStore()

// 接口定义
interface Ticket {
  id: number
  tokenId: number
  activityId: number
  activityTitle: string
  choiceName: string
  purchasePrice: number
  status: 'active' | 'won' | 'lost' | 'listed' | 'claimed_reward'
  salePrice?: number
  seller?: string
  isListed?: boolean
  claimed?: boolean
}

// 接口定义
interface Choice {
  id: number;
  name: string;
}

interface Activity {
  id: number
  title: string
  choices: { id: number, name: string }[]
}

// 状态
const activeTab = ref<'owned' | 'market'>('owned')
const myTickets = ref<Ticket[]>([])
const marketTickets = ref<Ticket[]>([])
const activities = ref<Activity[]>([])
const selectedActivity = ref('')
const showSellModal = ref(false)
const sellPrice = ref(0)
const currentTicket = ref<Ticket | null>(null)
const loading = ref(false)
const error = ref('')
const ticketFilter = ref<'all' | 'active' | 'won' | 'lost'>('all');

// 计算属性
const isConnected = computed(() => contractStore.isConnected)
const userAddress = computed(() => contractStore.userAddress)

const filteredMarketTicketsInternal = computed(() => {
  const currentUserAddress = userAddress.value ? userAddress.value.toLowerCase() : '';
  
  let filtered = marketTickets.value;

  // 1. 过滤掉用户自己挂的单
  if (currentUserAddress) {
    filtered = filtered.filter(ticket => 
      ticket.seller && ticket.seller.toLowerCase() !== currentUserAddress
    );
  }

  // 2. 按活动ID过滤
  if (selectedActivity.value) {
    filtered = filtered.filter(ticket => 
      ticket.activityId === parseInt(selectedActivity.value)
    );
  }
  
  return filtered;
});

const filteredMyTickets = computed(() => {
  switch (ticketFilter.value) {
    case 'active':
      // “进行中”包括 active (未挂单) 和 listed (已挂单)
      return myTickets.value.filter(t => t.status === 'active' || t.status === 'listed');
    case 'won':
      // “已中奖”包括 won (未领奖) 和 claimed_reward (已领奖)
      return myTickets.value.filter(t => t.status === 'won' || t.status === 'claimed_reward');
    case 'lost':
      return myTickets.value.filter(t => t.status === 'lost');
    case 'all':
    default:
      return myTickets.value; 
  }
});

onMounted(() => {
  if (isConnected.value) {
    loadActivities().then(() => {
        loadMyTickets();
    });
    loadMarketTickets();
  }
})

// 加载我的彩票
const loadMyTickets = async () => {
  if (!contractStore.contract || !contractStore.userAddress) {
    error.value = '请先连接钱包';
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const ticketsInfo = await contractStore.getTicketsInfoByUser(contractStore.userAddress);
    const activityMap = new Map(activities.value.map(act => [act.id, act]));
    const ticketsList: Ticket[] = [];

    for (const info of ticketsInfo) {
      const activityId = Number(info.activityId);
      const activity = activityMap.get(activityId);
      const choiceIndex = Number(info.choiceIndex);
      const winningChoiceNum = Number(info.winningChoice);
      const claimed = info.claimed;
      const activityOver = info.activityOver;

      let status: Ticket['status'] = 'active';
      if (activityOver) {
        // 活动已结束，优先判断中奖/未中奖
        if (winningChoiceNum === choiceIndex) {
            status = claimed ? 'claimed_reward' : 'won';
        } else {
            status = 'lost';
        }
      } else if (info.isListed) {
          // 活动未结束，且已挂单
          status = 'listed';
      }

      ticketsList.push({
        id: Number(info.tokenId),
        tokenId: Number(info.tokenId),
        activityId: activityId,
        activityTitle: activity?.title || `活动 #${activityId}`,
        choiceName: activity?.choices[choiceIndex]?.name || `选项 #${choiceIndex}`,
        purchasePrice: parseFloat(ethers.formatEther(info.purchaseAmount)),
        status: status,
        isListed: info.isListed,
        claimed: claimed,
        salePrice: info.isListed ? parseFloat(ethers.formatEther(info.salePrice)) : undefined,
        seller: info.isListed ? (await contractStore.getTicketListing(Number(info.tokenId))).seller : undefined
      });
    }
    myTickets.value = ticketsList;
    
  } catch (err) {
    console.error('加载我的彩票失败:', err);
    error.value = '加载彩票失败';
  } finally {
    loading.value = false;
  }
}

// 加载市场彩票
const loadMarketTickets = async () => {
  if (!contractStore.contract) {
    return
  }
  loading.value = true;
  marketTickets.value = [];
  const allMarketTickets: Ticket[] = [];

  // 确保 activities 列表已加载
  if (activities.value.length === 0) {
      await loadActivities();
  }
  const activityMap = new Map(activities.value.map(act => [act.id, act]));
  const ticketContract = await contractStore.getLotteryTicketContract(false);

  try {
    // 遍历所有已知的活动
    for (const activity of activities.value) {
      
      //  检查活动是否结算
      const activityData = await contractStore.getActivity(activity.id);
      if (activityData.over) {
        continue; 
      }
      
      for (const choice of activity.choices) { // 遍历该活动的所有选项
        
        // 获取该活动/选项组合的订单簿
        const [tokenIds, prices] = await contractStore.getOrderBook(activity.id, choice.id);

        // 遍历该订单簿中的所有彩票
        for (let i = 0; i < tokenIds.length; i++) {
          const tokenId = Number(tokenIds[i]);
          if (tokenId === 0) continue; // 跳过空位

          const price = parseFloat(ethers.formatEther(prices[i]));

          // 获取彩票的原始购买价
          const purchaseAmount = await ticketContract.tokenToAmount(tokenId);
          
          // 获取卖家信息
          const listing = await contractStore.getTicketListing(tokenId);

          allMarketTickets.push({
            id: tokenId,
            tokenId: tokenId,
            activityId: activity.id,
            activityTitle: activity.title,
            choiceName: choice.name,
            purchasePrice: parseFloat(ethers.formatEther(purchaseAmount)),
            status: 'active', // 市场上的票总是 'active'
            salePrice: price,
            seller: listing.seller,
            isListed: true
          });
        }
      }
    }
    marketTickets.value = allMarketTickets;
  } catch (err) {
    console.error('加载市场彩票失败:', err)
  } finally {
    loading.value = false;
  }
}

// 加载活动
const loadActivities = async () => {
  if (!contractStore.contract) {
    return;
  }
  try {
    const nextActivityId = await contractStore.getNextActivityId();
    const activitiesList: Activity[] = [];

    for (let i = 0; i < nextActivityId; i++) {
      try {
        const activityData = await contractStore.getActivity(i);
        if (activityData.owner !== '0x0000000000000000000000000000000000000000') {
          activitiesList.push({
            id: i,
            title: activityData.description || `活动 #${i + 1}`,
            choices: activityData.choices.map((name: string, index: number) => ({ id: index, name }))
          });
        }
      } catch (err) {
        console.error(`获取活动 ${i} 失败:`, err);
      }
    }
    activities.value = activitiesList;
  } catch (err) {
    console.error('加载活动失败:', err);
  }
}

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap = {
    active: '进行中',
    won: '中奖 (可领奖)',
    lost: '未中奖',
    listed: '挂单中', 
    claimed_reward: '已领奖'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 格式化地址
const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// 挂单出售
const listForSale = (ticket: Ticket) => {
  currentTicket.value = ticket
  sellPrice.value = ticket.purchasePrice * 1.2 // 默认加价20%
  showSellModal.value = true
}

// 关闭挂单模态框
const closeSellModal = () => {
  showSellModal.value = false
  currentTicket.value = null
  sellPrice.value = 0
}

// 确认挂单
const confirmSell = async () => {
  if (!currentTicket.value) return

  if (!isConnected.value) {
    alert('请先连接钱包')
    return
  }

  try {
    loading.value = true
    
    const txHash = await contractStore.listTicket(
      currentTicket.value.tokenId,
      sellPrice.value
    )
    
    console.log('挂单成功，交易哈希:', txHash)
    alert('挂单成功！')
    
    await loadMyTickets()
    await loadMarketTickets()
    closeSellModal()
  } catch (error) {
    console.error('挂单失败:', error)
    alert('挂单失败，请检查网络连接')
  } finally {
    loading.value = false
  }
}

// 从市场购买
const buyFromMarket = async (ticket: Ticket) => {
  if (!isConnected.value) {
    alert('请先连接钱包')
    return
  }

  if (!ticket.salePrice) {
    alert('价格信息错误')
    return
  }

  try {
    loading.value = true
    
    const txHash = await contractStore.buyTicket(
      ticket.tokenId,
      ticket.salePrice
    )
    
    console.log('购买成功，交易哈希:', txHash)
    alert('购买成功！')
    
    await loadMyTickets()
    await loadMarketTickets()
  } catch (error) {
    console.error('购买失败:', error)
    alert('购买失败，请检查余额和网络连接')
  } finally {
    loading.value = false
  }
}

// 取消挂单
const cancelListing = async (ticket: Ticket) => {
  if (!isConnected.value) {
    alert('请先连接钱包');
    return;
  }

  try {
    loading.value = true;
    
    // 调用 store 中的 delistTicket
    const txHash = await contractStore.delistTicket(ticket.tokenId);
    
    console.log('取消挂单成功，交易哈希:', txHash);
    alert('取消挂单成功！');
    
    await loadMyTickets();
    await loadMarketTickets();
  } catch (error) {
    console.error('取消挂单失败:', error);
    alert('取消挂单失败，请检查网络连接');
  } finally {
    loading.value = false;
  }
}

// 领取奖励
const claimReward = async (ticket: Ticket) => {
  if (!isConnected.value) {
    alert('请先连接钱包')
    return
  }

  try {
    loading.value = true
    
    const txHash = await contractStore.getWins(ticket.tokenId);
    
    console.log('领取奖励成功，交易哈希:', txHash)
    alert('奖励领取成功！')
    
    await loadMyTickets()
  } catch (error) {
    console.error('领取奖励失败:', error)
    alert('领取奖励失败，请检查是否中奖')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.my-tickets {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.tabs {
  display: flex;
  border-bottom: 2px solid #eee;
  margin-bottom: 2rem;
}

.ticket-filters {
  display: flex;
  flex-wrap: wrap; /* 允许换行 */
  border-bottom: 2px solid #eee;
  margin-bottom: 2rem;
}

.tab-button {
  padding: 1rem 2rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
}

.tab-button.active {
  color: #3498db;
  border-bottom-color: #3498db;
}

.tab-button:hover {
  color: #3498db;
}

.tickets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.ticket-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  transition: transform 0.3s;
}

.ticket-card:hover {
  transform: translateY(-2px);
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.ticket-header h3 {
  color: #2c3e50;
  margin: 0;
  font-size: 1.1rem;
}

.ticket-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.ticket-status.active {
  background-color: #d4edda;
  color: #155724;
}

.ticket-status.won {
  background-color: #d1ecf1;
  color: #0c5460;
}

.ticket-status.lost {
  background-color: #f8d7da;
  color: #721c24;
}

.price-tag {
  background-color: #27ae60;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 500;
}

.ticket-info {
  margin-bottom: 1.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.label {
  color: #666;
}

.value {
  font-weight: 500;
  color: #2c3e50;
}

.ticket-actions {
  display: flex;
  gap: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.loading-state, .error-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.error-state {
  color: #e74c3c;
}

.error-state button {
  margin-top: 1rem;
}

.market-filters {
  margin-bottom: 2rem;
}

.market-filters select {
  max-width: 300px;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
}

.modal h3 {
  margin-bottom: 1.5rem;
  color: #2c3e50;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}
</style>