<template>
  <div class="home">
    <div class="hero">
      <h1>欢迎来到 EasyBet</h1>
      <p class="hero-subtitle">去中心化彩票系统 - 公平、透明、可交易</p>
      <div class="hero-actions">
        <router-link to="/activities" class="btn btn-primary">开始竞猜</router-link>
        <router-link to="/my-tickets" class="btn btn-success">我的彩票</router-link>
      </div>
    </div>

    <div class="features">
      <h2>系统特色</h2>
      <div class="grid grid-3">
        <div class="card">
          <h3>🎯 多样化竞猜</h3>
          <p>支持体育赛事、娱乐节目等多种竞猜项目，每个项目都有多个选项供您选择。</p>
        </div>
        <div class="card">
          <h3>🔄 自由交易</h3>
          <p>在结果公布前，您可以自由买卖彩票，应对突发状况，灵活调整策略。</p>
        </div>
        <div class="card">
          <h3>🔒 去中心化</h3>
          <p>基于区块链技术，所有交易公开透明，结果由智能合约自动执行，确保公平。</p>
        </div>
      </div>
    </div>

    <div class="stats">
      <h2>平台数据</h2>
      <div class="grid grid-3">
        <div class="card text-center">
          <h3>{{ stats.totalActivities }}</h3>
          <p>活跃竞猜项目</p>
        </div>
        <div class="card text-center">
          <h3>{{ stats.totalTickets }}</h3>
          <p>已售彩票数量</p>
        </div>
        <div class="card text-center">
          <h3>{{ stats.totalVolume }}</h3>
          <p>交易总额 (ETH)</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const stats = ref({
  totalActivities: 0,
  totalTickets: 0,
  totalVolume: 0
})

onMounted(() => {
  // 这里可以调用API获取统计数据
  // 目前使用模拟数据
  stats.value = {
    totalActivities: 12,
    totalTickets: 156,
    totalVolume: 2.5
  }
})
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
}

.hero {
  text-align: center;
  padding: 4rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  margin-bottom: 3rem;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.hero-subtitle {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.features, .stats {
  margin-bottom: 3rem;
}

.features h2, .stats h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: #2c3e50;
}

.card h3 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.card p {
  color: #666;
  line-height: 1.6;
}
</style>
