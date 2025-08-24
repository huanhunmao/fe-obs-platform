import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      // 让 @fe/core / @fe/sdk 直接指向源码，而不是未构建的包入口
      '@fe/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@fe/sdk': path.resolve(__dirname, '../../packages/sdk/src/index.ts'),
    },
  },
})
