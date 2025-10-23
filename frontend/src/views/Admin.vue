<template>
  <div class="admin">
    <div class="page-header">
      <h1>管理后台</h1>
      <p>公证人功能 - 创建和管理竞猜活动</p>
    </div>

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

    <!-- 创建活动标签页 -->
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
              placeholder="例如：NBA总决赛冠军"
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
            <label class="form-label">奖池金额 (ETH)：</label>
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
                <input 
                  v-model="choice.odds" 
                  type="number" 
                  class="form-input" 
                  step="0.1"
                  min="1.0"
                  placeholder="赔率"
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
            <button type="submit" class="btn btn-success">创建活动</button>
            <button type="button" class="btn" @click="resetForm">重置</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 管理活动标签页 -->
    <div v-if="activeTab === 'manage'" class="tab-content">
      <div class="activities-list">
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
              <span class="value">{{ activity.prizePool }} ETH</span>
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
            >
              结束活动
            </button>
            <button 
              v-if="activity.status === 'ended'"
              class="btn btn-primary"
              @click="startSettlement(activity.id)"
            >
              开始结算
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 结算活动标签页 -->
    <div v-if="activeTab === 'settle'" class="tab-content">
      <div class="settlement-list">
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
                <span class="choice-odds">(赔率: {{ choice.odds }})</span>
              </label>
            </div>
          </div>

          <div class="settlement-actions">
            <button 
              class="btn btn-success"
              @click="settleActivity(activity.id)"
              :disabled="!activity.winnerId"
            >
              确认结算
            </button>
          </div>
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
  winnerId?: number
}

const activeTab = ref<'create' | 'manage' | 'settle'>('create')
const activities = ref<Activity[]>([])

const newActivity = ref({
  title: '',
  description: '',
  prizePool: 1.0,
  deadline: '',
  choices: [
    { name: '', odds: 2.0 },
    { name: '', odds: 2.0 }
  ]
})

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
      status: 'ended'
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

const addChoice = () => {
  newActivity.value.choices.push({ name: '', odds: 2.0 })
}

const removeChoice = (index: number) => {
  if (newActivity.value.choices.length > 2) {
    newActivity.value.choices.splice(index, 1)
  }
}

const resetForm = () => {
  newActivity.value = {
    title: '',
    description: '',
    prizePool: 1.0,
    deadline: '',
    choices: [
      { name: '', odds: 2.0 },
      { name: '', odds: 2.0 }
    ]
  }
}

const createActivity = () => {
  // 这里应该调用智能合约的创建活动函数
  console.log('创建活动:', newActivity.value)
  
  // 模拟创建成功
  alert('活动创建成功！')
  resetForm()
  loadActivities()
}

const endActivity = (activityId: number) => {
  // 这里应该调用智能合约的结束活动函数
  console.log('结束活动:', activityId)
  
  alert('活动已结束！')
  loadActivities()
}

const startSettlement = (activityId: number) => {
  // 这里应该调用智能合约的开始结算函数
  console.log('开始结算:', activityId)
  
  alert('开始结算流程！')
  loadActivities()
}

const settleActivity = (activityId: number) => {
  const activity = activities.value.find(a => a.id === activityId)
  if (activity && activity.winnerId) {
    // 这里应该调用智能合约的结算函数
    console.log('结算活动:', {
      activityId,
      winnerId: activity.winnerId
    })
    
    alert('活动结算完成！')
    loadActivities()
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

.choice-odds {
  color: #666;
  font-size: 0.9rem;
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
</style>
