<template>
  <div class="activities">
    <div class="page-header">
      <h1>竞猜活动</h1>
      <p>参与各种有趣的竞猜项目，赢取丰厚奖励</p>
    </div>

    <div class="activities-grid">
      <div v-for="activity in activities" :key="activity.id" class="activity-card">
        <div class="activity-header">
          <h3>{{ activity.title }}</h3>
          <span class="activity-status" :class="activity.status">
            {{ getStatusText(activity.status) }}
          </span>
        </div>
        
        <p class="activity-description">{{ activity.description }}</p>
        
        <div class="activity-choices">
          <h4>竞猜选项：</h4>
          <div class="choices-list">
            <div v-for="choice in activity.choices" :key="choice.id" class="choice-item">
              <span class="choice-name">{{ choice.name }}</span>
              <span class="choice-odds">赔率: {{ choice.odds }}</span>
              <button 
                class="btn btn-primary btn-sm"
                @click="buyTicket(activity.id, choice.id)"
                :disabled="activity.status !== 'active'"
              >
                购买彩票
              </button>
            </div>
          </div>
        </div>

        <div class="activity-info">
          <div class="info-item">
            <span class="label">奖池总额：</span>
            <span class="value">{{ activity.prizePool }} ETH</span>
          </div>
          <div class="info-item">
            <span class="label">截止时间：</span>
            <span class="value">{{ formatDate(activity.deadline) }}</span>
          </div>
          <div class="info-item">
            <span class="label">已售彩票：</span>
            <span class="value">{{ activity.soldTickets }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 购买彩票模态框 -->
    <div v-if="showBuyModal" class="modal-overlay" @click="closeBuyModal">
      <div class="modal" @click.stop>
        <h3>购买彩票</h3>
        <div class="form-group">
          <label class="form-label">选择数量：</label>
          <input 
            v-model="buyAmount" 
            type="number" 
            class="form-input" 
            min="1" 
            :max="maxBuyAmount"
          />
        </div>
        <div class="form-group">
          <label class="form-label">总价格：</label>
          <span class="price">{{ (buyAmount * ticketPrice).toFixed(4) }} ETH</span>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="confirmBuy">确认购买</button>
          <button class="btn" @click="closeBuyModal">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Choice {
  id: number
  name: string
  odds: number
}

interface Activity {
  id: number
  title: string
  description: string
  choices: Choice[]
  prizePool: number
  deadline: string
  soldTickets: number
  status: 'active' | 'ended' | 'settled'
}

const activities = ref<Activity[]>([])
const showBuyModal = ref(false)
const buyAmount = ref(1)
const ticketPrice = ref(0.01)
const maxBuyAmount = ref(100)

const currentActivity = ref<number | null>(null)
const currentChoice = ref<number | null>(null)

onMounted(() => {
  loadActivities()
})

const loadActivities = () => {
  // 模拟数据，实际应该从智能合约获取
  activities.value = [
    {
      id: 1,
      title: "NBA总决赛冠军",
      description: "预测2025年NBA总决赛的冠军队伍",
      choices: [
        { id: 1, name: "湖人队", odds: 2.5 },
        { id: 2, name: "勇士队", odds: 3.2 },
        { id: 3, name: "凯尔特人队", odds: 2.8 }
      ],
      prizePool: 5.0,
      deadline: "2025-06-15T23:59:59Z",
      soldTickets: 45,
      status: 'active'
    },
    {
      id: 2,
      title: "欧冠决赛结果",
      description: "预测2025年欧冠决赛的胜负结果",
      choices: [
        { id: 1, name: "主队胜", odds: 1.8 },
        { id: 2, name: "客队胜", odds: 2.1 },
        { id: 3, name: "平局", odds: 3.5 }
      ],
      prizePool: 3.2,
      deadline: "2025-05-30T21:00:00Z",
      soldTickets: 28,
      status: 'active'
    }
  ]
}

const getStatusText = (status: string) => {
  const statusMap = {
    active: '进行中',
    ended: '已结束',
    settled: '已结算'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const buyTicket = (activityId: number, choiceId: number) => {
  currentActivity.value = activityId
  currentChoice.value = choiceId
  showBuyModal.value = true
}

const closeBuyModal = () => {
  showBuyModal.value = false
  currentActivity.value = null
  currentChoice.value = null
  buyAmount.value = 1
}

const confirmBuy = () => {
  // 这里应该调用智能合约的购买彩票函数
  console.log('购买彩票:', {
    activityId: currentActivity.value,
    choiceId: currentChoice.value,
    amount: buyAmount.value
  })
  
  // 模拟购买成功
  alert('彩票购买成功！')
  closeBuyModal()
}
</script>

<style scoped>
.activities {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-header h1 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.activities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
}

.activity-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  transition: transform 0.3s;
}

.activity-card:hover {
  transform: translateY(-2px);
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.activity-header h3 {
  color: #2c3e50;
  margin: 0;
}

.activity-status {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.activity-status.active {
  background-color: #d4edda;
  color: #155724;
}

.activity-status.ended {
  background-color: #f8d7da;
  color: #721c24;
}

.activity-status.settled {
  background-color: #d1ecf1;
  color: #0c5460;
}

.activity-description {
  color: #666;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

.activity-choices h4 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.choices-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.choice-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.choice-name {
  font-weight: 500;
}

.choice-odds {
  color: #666;
  font-size: 0.9rem;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.activity-info {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #eee;
}

.info-item {
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

.price {
  font-size: 1.2rem;
  font-weight: bold;
  color: #27ae60;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}
</style>
