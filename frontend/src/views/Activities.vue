<template>
  <div class="activities">
    <div class="page-header">
      <h1>竞猜活动</h1>
      <p>参与各种有趣的竞猜项目，赢取丰厚奖励</p>
    </div>

    <div class="activity-filters">
      <button 
        class="tab-button" 
        :class="{ active: activityFilter === 'all' }"
        @click="activityFilter = 'all'"
      >
        全部活动
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activityFilter === 'active' }"
        @click="activityFilter = 'active'"
      >
        进行中
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activityFilter === 'ended' }"
        @click="activityFilter = 'ended'"
      >
        已结束 / 已结算
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <p>正在加载活动...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="loadActivities" class="btn btn-primary">重试</button>
    </div>

    <div v-else-if="activities.length === 0" class="empty-state">
      <p>暂无活动</p>
    </div>

    <div v-else-if="filteredActivities.length === 0" class="empty-state">
      <p>当前筛选条件下没有活动</p>
    </div>

    <div v-else class="activities-grid">
      <div v-for="activity in filteredActivities" :key="activity.id" class="activity-card">
        
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
              <button 
                class="btn btn-primary btn-sm"
                @click="buyTicket(activity.id, choice.id)"
                :disabled="activity.status !== 'active' || !isConnected"
              >
                {{ isConnected ? '购买彩票' : '请先连接钱包' }}
              </button>
            </div>
          </div>
        </div>

        <div class="activity-info">
          <div class="info-item">
            <span class="label">奖池总额：</span>
            <span class="value">{{ activity.prizePool }} 积分</span>
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
          <label class="form-label">下注金额：</label>
          <span class="price">
            {{ (buyAmount || 0).toFixed(2) }} 积分
          </span>
        </div>
        <div class="modal-actions">
          <button 
            class="btn btn-primary" 
            @click="confirmBuy"
            :disabled="loading"
          >
            {{ loading ? '处理中...' : '确认购买' }}
          </button>
          <button class="btn" @click="closeBuyModal" :disabled="loading">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useContractStore } from '@/stores/contract'
import { ethers } from 'ethers'

// 接口定义
interface Choice {
  id: number
  name: string
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
  totalAmount: string
  amountsPerChoice: { [key: number]: string }
}

// Store和状态
const contractStore = useContractStore()

const activities = ref<Activity[]>([])
const showBuyModal = ref(false)
const buyAmount = ref(1)
const maxBuyAmount = ref(100)
const loading = ref(false)
const error = ref('')
const currentActivity = ref<number | null>(null)
const currentChoice = ref<number | null>(null)
const activityFilter = ref<'all' | 'active' | 'ended'>('all');

// 计算属性
const isConnected = computed(() => contractStore.isConnected)

const filteredActivities = computed(() => {
  if (activityFilter.value === 'active') {
    return activities.value.filter(a => a.status === 'active');
  }
  if (activityFilter.value === 'ended') {
    return activities.value.filter(a => a.status === 'ended' || a.status === 'settled');
  }
  return activities.value; // 'all'
});

// 生命周期
onMounted(() => {
  loadActivities()
})

// 方法
const loadActivities = async () => {
  if (!contractStore.contract) {
    return
  }

  loading.value = true
  error.value = ''

  try {
    const nextActivityId = await contractStore.getNextActivityId()
    const activitiesList: Activity[] = []

    for (let i = 0; i < nextActivityId; i++) {
      try {
        const activityData = await contractStore.getActivity(i)
        
        if (activityData.owner === '0x0000000000000000000000000000000000000000') {
          continue
        }

        const choices = await contractStore.getActivityChoices(i)

        const now = Math.floor(Date.now() / 1000)
        const deadline = Number(activityData.listedTimestamp)
        const isOver = activityData.over
        const status = isOver ? 'settled' : (now > deadline ? 'ended' : 'active')

        const amountsPerChoice: { [key: number]: string } = {}
        for (let j = 0; j < choices.length; j++) {
          const amount = await contractStore.getAmountsPerChoice(i, j)
          amountsPerChoice[j] = ethers.formatEther(amount)
        }

        const activity: Activity = {
          id: i,
          title: activityData.title || `活动 #${i + 1}`,
          description: activityData.description,
          choices: choices.map((choice: string, index: number) => ({
            id: index,
            name: choice
          })),
          prizePool: parseFloat(ethers.formatEther(activityData.totalAmount)),
          deadline: new Date(deadline * 1000).toISOString(),
          soldTickets: Number(activityData.soldTickets), 
          status,
          totalAmount: ethers.formatEther(activityData.totalAmount),
          amountsPerChoice
        }
        activitiesList.push(activity)
      } catch (err) {
        console.error(`获取活动 ${i} 失败:`, err)
      }
    }
    activities.value = activitiesList
  } catch (err) {
    console.error('加载活动失败:', err)
    error.value = '加载活动失败，请检查网络连接'
  } finally {
    loading.value = false
  }
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

const confirmBuy = async () => {
  if (!isConnected.value) {
    alert('请先连接钱包')
    return
  }

  if (currentActivity.value === null || currentChoice.value === null) {
    alert('请选择活动选项')
    return
  }
  
  try {
    loading.value = true
    
    const txHash = await contractStore.placeBet(
      currentActivity.value,
      currentChoice.value,
      buyAmount.value 
    )
    
    console.log('下注成功，交易哈希:', txHash)
    alert('下注成功！')
    
    await loadActivities()
    closeBuyModal()
  } catch (error) {
    console.error('下注失败:', error)
    alert('下注失败，请检查余额和网络连接')
  } finally {
    loading.value = false
  }
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

.activity-filters {
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

.loading-state, .error-state, .empty-state {
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

.payment-methods {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.payment-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.payment-option:hover {
  background-color: #f8f9fa;
}

.payment-option input[type="radio"] {
  margin: 0;
}
</style>