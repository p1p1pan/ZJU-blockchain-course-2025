<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-container">
        <h1 class="nav-title">EasyBet</h1>
        <div class="nav-links">
          <router-link to="/" class="nav-link">首页</router-link>
          <router-link to="/activities" class="nav-link">竞猜活动</router-link>
          <router-link to="/my-tickets" class="nav-link">我的彩票</router-link>
          <router-link to="/admin" class="nav-link">管理后台</router-link>
        </div>
        <div class="wallet-section">
          <div v-if="!isConnected" class="wallet-connect">
            <button @click="connectWallet" class="btn btn-primary">
              连接钱包
            </button>
          </div>
          <div v-else class="wallet-info">
            <div class="user-info">
              <span class="user-address">{{ formatAddress(userAddress) }}</span>
              <span class="balance" v-if="betTokenBalance">积分: {{ betTokenBalance }}</span>
            </div>
            <button @click="disconnectWallet" class="btn btn-secondary btn-sm">
              断开连接
            </button>
          </div>
        </div>
      </div>
    </nav>
    
    <main class="main-content">
      <router-view />
    </main>
    
    <footer class="footer">
      <p>&copy; 2025 EasyBet - 去中心化彩票系统</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useContractStore } from '@/stores/contract'

const contractStore = useContractStore()

// 响应式数据
const isConnected = computed(() => contractStore.isConnected)
const userAddress = computed(() => contractStore.userAddress)
const betTokenBalance = ref('')

// 方法
const connectWallet = async () => {
  try {
    const success = await contractStore.connectWallet()
    if (success) {
      await loadBetTokenBalance()
    }
  } catch (error) {
    console.error('连接钱包失败:', error)
    alert('连接钱包失败，请检查是否安装了MetaMask')
  }
}

const disconnectWallet = () => {
  contractStore.disconnectWallet()
  betTokenBalance.value = ''
}

const formatAddress = (address: string) => {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const loadBetTokenBalance = async () => {
  if (isConnected.value && userAddress.value) {
    try {
      const balance = await contractStore.getBetTokenBalance(userAddress.value)
      betTokenBalance.value = parseFloat(balance).toFixed(2)
    } catch (error) {
      console.error('获取积分余额失败:', error)
    }
  }
}

// 监听钱包连接状态变化
onMounted(() => {
  if (isConnected.value) {
    loadBetTokenBalance()
  }
})
</script>

<style scoped>
.navbar {
  background-color: #2c3e50;
  color: white;
  padding: 1rem 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
}

.nav-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: bold;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-link {
  color: white;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.nav-link:hover,
.nav-link.router-link-active {
  background-color: #34495e;
}

.wallet-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.wallet-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.user-address {
  font-size: 0.9rem;
  font-weight: 500;
}

.balance {
  font-size: 0.8rem;
  color: #bdc3c7;
}

.main-content {
  min-height: calc(100vh - 200px);
  padding: 2rem;
}

.footer {
  background-color: #34495e;
  color: white;
  text-align: center;
  padding: 1rem;
  margin-top: auto;
}
</style>
