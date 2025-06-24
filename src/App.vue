<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <nav>
    <RouterLink to="/">首页</RouterLink>
    <RouterLink to="/vocabulary">单词</RouterLink>
    <RouterLink to="/grammar">语法</RouterLink>
    <RouterLink to="/passage">文章</RouterLink>
    <RouterLink to="/stats">数据统计</RouterLink>
    <RouterLink to="/settings">设置</RouterLink>
    <RouterLink to="/about">关于</RouterLink>
  </nav>
  <RouterView />
</template>

<style scoped>
nav {
  width: 100%;
  font-size: 16px;
  text-align: center;
  margin-top: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

nav a.router-link-exact-active {
  color: #007bff;
}

nav a {
  display: inline-block;
  padding: 0 15px;
  text-decoration: none;
  color: #333;
  font-weight: bold;
}

nav a:hover {
  background-color: #f0f0f0;
  border-radius: 5px;
}
</style>
