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

    </div>
</template>

<script setup lang="ts">
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

</style>