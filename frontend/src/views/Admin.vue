<template>
  <div class="admin">
    <div class="page-header">
      <h1>管理后台</h1>
      <p>公证人功能 - 创建和管理竞猜活动</p>
    </div>

    <div v-if="!isConnected" class="permission-warning">
      <p>请先连接钱包</p>
    </div>

    <div v-else-if="!isAdmin" class="permission-warning">
      <p>您没有管理员权限，无法访问管理后台</p>
    </div>

    <div v-else>

    <div class="admin-tabs">
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'create' }"
        @click="activeTab = 'create'"
      >
        创建活动
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'manage' }"
        @click="activeTab = 'manage'"
      >
        管理活动
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'settle' }"
        @click="activeTab = 'settle'"
      >
        结算活动
      </button>
    </div>

    <div v-if="activeTab === 'create'" class="tab-content">
      <div class="card">
        <h2>创建新的竞猜活动</h2>
        <form @submit.prevent="createActivity">
          <div class="form-group">
            <label class="form-label">活动标题：</label>
            <input 
              v-model="newActivity.title" 
              type="text" 
              class="form-input" 
              required
              placeholder="例如：xx总决赛冠军"
            />
          </div>

          <div class="form-group">
            <label class="form-label">活动描述：</label>
            <textarea 
              v-model="newActivity.description" 
              class="form-input" 
              rows="3"
              required
              placeholder="详细描述这个竞猜活动"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">奖池金额 (积分)：</label>
            <input 
              v-model="newActivity.prizePool" 
              type="number" 
              class="form-input" 
              step="0.1"
              min="0.1"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">截止时间：</label>
            <input 
              v-model="newActivity.deadline" 
              type="datetime-local" 
              class="form-input" 
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">竞猜选项：</label>
            <div class="choices-container">
              <div v-for="(choice, index) in newActivity.choices" :key="index" class="choice-input">
                <input 
                  v-model="choice.name" 
                  type="text" 
                  class="form-input" 
                  placeholder="选项名称"
                  required
                />
                <button 
                  type="button" 
                  class="btn btn-danger btn-sm"
                  @click="removeChoice(index)"
                  :disabled="newActivity.choices.length <= 2"
                >
                  删除
                </button>
              </div>
            </div>
            <button 
              type="button" 
              class="btn btn-primary btn-sm"
              @click="addChoice"
            >
              添加选项
            </button>
          </div>

          <div class="form-actions">
            <button 
              type="submit" 
              class="btn btn-success"
              :disabled="loading"
            >
              {{ loading ? '创建中...' : '创建活动' }}
            </button>
            <button 
              type="button" 
              class="btn" 
              @click="resetForm"
              :disabled="loading"
            >
              重置
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="activeTab === 'manage'" class="tab-content">
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

      <div v-else class="activities-list">
        <div v-for="activity in activities" :key="activity.id" class="activity-card">
          <div class="activity-header">
            <h3>{{ activity.title }}</h3>
            <span class="activity-status" :class="activity.status">
              {{ getStatusText(activity.status) }}
            </span>
          </div>
          
          <p class="activity-description">{{ activity.description }}</p>
          
          <div class="activity-stats">
            <div class="stat-item">
              <span class="label">奖池：</span>
              <span class="value">{{ activity.prizePool }} 积分</span>
            </div>
            <div class="stat-item">
              <span class="label">已售彩票：</span>
              <span class="value">{{ activity.soldTickets }}</span>
            </div>
            <div class="stat-item">
              <span class="label">截止时间：</span>
              <span class="value">{{ formatDate(activity.deadline) }}</span>
            </div>
          </div>

          <div class="activity-actions">
            <button 
              v-if="activity.status === 'active'"
              class="btn btn-warning"
              @click="endActivity(activity.id)"
              :disabled="loading" >
              结束活动
            </button>

          </div>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'settle'" class="tab-content">
      <div v-if="loading" class="loading-state">
        <p>正在加载活动...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <button @click="loadActivities" class="btn btn-primary">重试</button>
      </div>

      <div v-else-if="activities.filter(a => a.status === 'ended').length === 0" class="empty-state">
        <p>暂无需要结算的活动</p>
      </div>

      <div v-else class="settlement-list">
        <div v-for="activity in activities.filter(a => a.status === 'ended')" :key="activity.id" class="settlement-card">
          <h3>{{ activity.title }}</h3>
          
          <div class="choices-list">
            <h4>选择获胜选项：</h4>
            <div class="choices-grid">
              <label 
                v-for="choice in activity.choices" 
                :key="choice.id" 
                class="choice-option"
              >
                <input 
                  type="radio" 
                  :name="`winner-${activity.id}`"
                  :value="choice.id"
                  v-model="activity.winnerId"
                />
                <span class="choice-name">{{ choice.name }}</span>
              </label>
            </div>
          </div>

          <div class="settlement-actions">
            <button 
              class="btn btn-success"
              @click="settleActivity(activity.id)"
              :disabled="activity.winnerId === undefined || loading"
            >
              {{ loading ? '处理中...' : '确认结算' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useContractStore } from '@/stores/contract'
import { ethers } from 'ethers'

const contractStore = useContractStore()

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
  winnerId?: number
  totalAmount: string
  amountsPerChoice: { [key: number]: string }
}

const activeTab = ref<'create' | 'manage' | 'settle'>('create')
const activities = ref<Activity[]>([])
const loading = ref(false)
const error = ref('')

const newActivity = ref({
  title: '',
  description: '',
  prizePool: 1.0,
  deadline: '',
  choices: [
    { name: '' },
    { name: '' }
  ]
})

// 计算属性
const isConnected = computed(() => contractStore.isConnected)
const isAdmin = computed(() => contractStore.isAdmin)

onMounted(() => {
  if (isConnected.value) {
    loadActivities()
  }
})

// 加载活动
const loadActivities = async () => {
  if (!contractStore.contract) {
    error.value = '请先连接钱包并加载合约'
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
        
        // 检查活动是否存在
        if (activityData.owner === '0x0000000000000000000000000000000000000000') {
          continue
        }

        // 获取选项列表
        const choices = await contractStore.getActivityChoices(i)

        // 计算状态
        const now = Math.floor(Date.now() / 1000)
        const deadline = Number(activityData.listedTimestamp)
        const isOver = activityData.over
        const status = isOver ? 'settled' : (now > deadline ? 'ended' : 'active')

        // 计算每个选项的投注金额
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

// 获取活动状态文本
const getStatusText = (status: string) => {
  const statusMap = {
    active: '进行中',
    ended: '已结束',
    settled: '已结算'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

// 格式化日期
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 添加选项
const addChoice = () => {
  newActivity.value.choices.push({ name: '' })
}

// 删除选项
const removeChoice = (index: number) => {
  if (newActivity.value.choices.length > 2) {
    newActivity.value.choices.splice(index, 1)
  }
}

// 重置表单
const resetForm = () => {
  newActivity.value = {
    title: '',
    description: '',
    prizePool: 1.0,
    deadline: '',
    choices: [
      { name: '' },
      { name: '' }
    ]
  }
}

// 创建活动
const createActivity = async () => {
  if (!isConnected.value) {
    alert('请先连接钱包')
    return
  }

  if (!isAdmin.value) {
    alert('您没有管理员权限')
    return
  }

  // 验证表单
  if (!newActivity.value.description.trim()) {
    alert('请输入活动描述')
    return
  }

  if (!newActivity.value.title.trim()) {
            alert('请输入活动标题')
            return
  }

  if (newActivity.value.choices.length < 2) {
    alert('至少需要两个选项')
    return
  }

  for (const choice of newActivity.value.choices) {
    if (!choice.name.trim()) {
      alert('请填写所有选项名称')
      return
    }
  }

  if (!newActivity.value.deadline) {
    alert('请选择截止时间')
    return
  }

  if (new Date(newActivity.value.deadline) <= new Date()) {
    alert('截止时间必须晚于当前时间')
    return
  }

  try {
    loading.value = true
    
    const activityData = {
      title: newActivity.value.title,
      description: newActivity.value.description,
      choices: newActivity.value.choices.map(choice => choice.name),
      prizePool: newActivity.value.prizePool,
      deadline: newActivity.value.deadline
    }

    const txHash = await contractStore.createActivity(activityData)
    
    console.log('活动创建成功，交易哈希:', txHash)
    alert('活动创建成功！')
    
    resetForm()
    await loadActivities()
  } catch (error) {
    console.error('创建活动失败:', error)
    alert('创建活动失败，请检查网络连接和权限')
  } finally {
    loading.value = false
  }
}

// 提前结束活动
const endActivity = async (activityId: number) => {
  if (!isConnected.value) { 
    alert('请先连接钱包');
    return;
  }

  try {
    loading.value = true;
    const txHash = await contractStore.endBettingEarly(activityId);
    console.log('活动已提前结束, tx:', txHash);
    alert('活动投注已提前截止！现在可以去“结算活动”标签页等待结果并结算。');
    await loadActivities(); 
  } catch (error) {
    console.error('结束活动失败:', error);
    alert('结束活动失败，请检查是否已结束或已结算');
  } finally {
    loading.value = false;
  }
}

// 结算活动
const settleActivity = async (activityId: number) => {
  const activity = activities.value.find(a => a.id === activityId)
  if (!activity || activity.winnerId === undefined) {
    alert('请选择获胜选项')
    return
  }

  if (!isConnected.value) {
    alert('请先连接钱包')
    return
  }

  if (!isAdmin.value) {
    alert('您没有管理员权限')
    return
  }

  try {
    loading.value = true
    
    const txHash = await contractStore.resolveActivity(activityId, activity.winnerId)
    
    console.log('活动结算成功，交易哈希:', txHash)
    alert('活动结算完成！')
    
    await loadActivities()
  } catch (error) {
    console.error('结算活动失败:', error)
    alert('结算活动失败，请检查网络连接和权限')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.admin {
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

.admin-tabs {
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

.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}

.card h2 {
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

.choices-container {
  margin-bottom: 1rem;
}

.choice-input {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  align-items: center;
}

.choice-input input {
  flex: 1;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.activities-list, .settlement-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.activity-card, .settlement-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
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

.activity-stats {
  margin-bottom: 1.5rem;
}

.stat-item {
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

.activity-actions {
  display: flex;
  gap: 0.5rem;
}

.choices-list h4 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.choices-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.choice-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  cursor: pointer;
}

.choice-option:hover {
  background-color: #e9ecef;
}

.choice-name {
  font-weight: 500;
}

.settlement-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-warning {
  background-color: #f39c12;
  color: white;
}

.btn-warning:hover {
  background-color: #e67e22;
}

textarea.form-input {
  resize: vertical;
  min-height: 80px;
}

.permission-warning {
  text-align: center;
  padding: 3rem;
  color: #e74c3c;
  background-color: #f8d7da;
  border-radius: 8px;
  margin: 2rem 0;
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
</style>