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

    <!-- 我的彩票标签页 -->
    <div v-if="activeTab === 'owned'" class="tab-content">
      <div v-if="myTickets.length === 0" class="empty-state">
        <p>您还没有购买任何彩票</p>
        <router-link to="/activities" class="btn btn-primary">去购买彩票</router-link>
      </div>
      
      <div v-else class="tickets-grid">
        <div v-for="ticket in myTickets" :key="ticket.id" class="ticket-card">
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
              <span class="value">{{ ticket.purchasePrice }} ETH</span>
            </div>
            <div class="info-row">
              <span class="label">购买时间：</span>
              <span class="value">{{ formatDate(ticket.purchaseTime) }}</span>
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
            >
              挂单出售
            </button>
            <button 
              v-if="ticket.status === 'won'"
              class="btn btn-success"
              @click="claimReward(ticket)"
            >
              领取奖励
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 交易市场标签页 -->
    <div v-if="activeTab === 'market'" class="tab-content">
      <div class="market-filters">
        <select v-model="selectedActivity" class="form-input">
          <option value="">所有活动</option>
          <option v-for="activity in activities" :key="activity.id" :value="activity.id">
            {{ activity.title }}
          </option>
        </select>
      </div>

      <div v-if="marketTickets.length === 0" class="empty-state">
        <p>当前没有可交易的彩票</p>
      </div>
      
      <div v-else class="tickets-grid">
        <div v-for="ticket in filteredMarketTickets" :key="ticket.id" class="ticket-card">
          <div class="ticket-header">
            <h3>{{ ticket.activityTitle }}</h3>
            <span class="price-tag">{{ ticket.salePrice }} ETH</span>
          </div>
          
          <div class="ticket-info">
            <div class="info-row">
              <span class="label">选择：</span>
              <span class="value">{{ ticket.choiceName }}</span>
            </div>
            <div class="info-row">
              <span class="label">原购买价：</span>
              <span class="value">{{ ticket.purchasePrice }} ETH</span>
            </div>
            <div class="info-row">
              <span class="label">卖家：</span>
              <span class="value">{{ formatAddress(ticket.seller) }}</span>
            </div>
          </div>

          <div class="ticket-actions">
            <button class="btn btn-success" @click="buyFromMarket(ticket)">
              购买
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 挂单出售模态框 -->
    <div v-if="showSellModal" class="modal-overlay" @click="closeSellModal">
      <div class="modal" @click.stop>
        <h3>挂单出售</h3>
        <div class="form-group">
          <label class="form-label">出售价格 (ETH)：</label>
          <input 
            v-model="sellPrice" 
            type="number" 
            class="form-input" 
            step="0.001"
            min="0.001"
          />
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="confirmSell">确认挂单</button>
          <button class="btn" @click="closeSellModal">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Ticket {
  id: number
  tokenId: number
  activityId: number
  activityTitle: string
  choiceName: string
  purchasePrice: number
  purchaseTime: string
  status: 'active' | 'won' | 'lost' | 'sold'
  salePrice?: number
  seller?: string
}

interface Activity {
  id: number
  title: string
}

const activeTab = ref<'owned' | 'market'>('owned')
const myTickets = ref<Ticket[]>([])
const marketTickets = ref<Ticket[]>([])
const activities = ref<Activity[]>([])
const selectedActivity = ref('')
const showSellModal = ref(false)
const sellPrice = ref(0)
const currentTicket = ref<Ticket | null>(null)

const filteredMarketTickets = computed(() => {
  if (!selectedActivity.value) {
    return marketTickets.value
  }
  return marketTickets.value.filter(ticket => 
    ticket.activityId === parseInt(selectedActivity.value)
  )
})

onMounted(() => {
  loadMyTickets()
  loadMarketTickets()
  loadActivities()
})

const loadMyTickets = () => {
  // 模拟数据，实际应该从智能合约获取
  myTickets.value = [
    {
      id: 1,
      tokenId: 1001,
      activityId: 1,
      activityTitle: "NBA总决赛冠军",
      choiceName: "湖人队",
      purchasePrice: 0.01,
      purchaseTime: "2025-01-15T10:30:00Z",
      status: 'active'
    },
    {
      id: 2,
      tokenId: 1002,
      activityId: 2,
      activityTitle: "欧冠决赛结果",
      choiceName: "主队胜",
      purchasePrice: 0.02,
      purchaseTime: "2025-01-14T15:45:00Z",
      status: 'won'
    }
  ]
}

const loadMarketTickets = () => {
  // 模拟数据，实际应该从智能合约获取
  marketTickets.value = [
    {
      id: 3,
      tokenId: 1003,
      activityId: 1,
      activityTitle: "NBA总决赛冠军",
      choiceName: "勇士队",
      purchasePrice: 0.01,
      purchaseTime: "2025-01-13T09:20:00Z",
      status: 'active',
      salePrice: 0.015,
      seller: "0x1234...5678"
    }
  ]
}

const loadActivities = () => {
  activities.value = [
    { id: 1, title: "NBA总决赛冠军" },
    { id: 2, title: "欧冠决赛结果" }
  ]
}

const getStatusText = (status: string) => {
  const statusMap = {
    active: '进行中',
    won: '中奖',
    lost: '未中奖',
    sold: '已出售'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const listForSale = (ticket: Ticket) => {
  currentTicket.value = ticket
  sellPrice.value = ticket.purchasePrice * 1.2 // 默认加价20%
  showSellModal.value = true
}

const closeSellModal = () => {
  showSellModal.value = false
  currentTicket.value = null
  sellPrice.value = 0
}

const confirmSell = () => {
  if (currentTicket.value) {
    // 这里应该调用智能合约的挂单函数
    console.log('挂单出售:', {
      tokenId: currentTicket.value.tokenId,
      price: sellPrice.value
    })
    
    alert('挂单成功！')
    closeSellModal()
  }
}

const buyFromMarket = (ticket: Ticket) => {
  // 这里应该调用智能合约的购买函数
  console.log('从市场购买:', {
    tokenId: ticket.tokenId,
    price: ticket.salePrice
  })
  
  alert('购买成功！')
}

const claimReward = (ticket: Ticket) => {
  // 这里应该调用智能合约的领取奖励函数
  console.log('领取奖励:', ticket.tokenId)
  
  alert('奖励领取成功！')
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
