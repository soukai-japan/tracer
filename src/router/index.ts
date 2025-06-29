import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('../views/StatsView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
    {
      path: '/vocabulary',
      name: 'vocabulary',
      component: () => import('../views/VocabularyView.vue'),
    },
    {
      path: '/grammar',
      name: 'grammar',
      component: () => import('../views/GrammarView.vue'),
    },
    {
      path: '/passage',
      name: 'passage',
      component: () => import('../views/PassageView.vue'),
    },
    {
      path: '/passage/:id',
      name: 'passage-content',
      component: () => import('../views/PassageContentView.vue'),
      props: true,
    },
  ],
})

export default router
