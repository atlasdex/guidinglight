<template>
  <Footer :class="isMobile ? 'mobile' : 'pc'">
    <div v-if="!isMobile" class="logo">
      <a href="/"><img src="@/assets/icons/logo-text.png" width="120px" /></a>
    </div>
    <div v-if="isMobile" class="logo">
      <a href="/"><img src="@/assets/icons/logo-text.png" width="120px" /></a>
    </div>
  </Footer>
</template>

<script lang="ts">
import { Vue, Component } from 'nuxt-property-decorator'

import { Layout } from 'ant-design-vue'

const { Footer } = Layout

@Component({
  components: {
    Footer
  }
})
export default class Foot extends Vue {
  navOpened = false

  get isMobile() {
    return this.$accessor.isMobile
  }

  beforeMount() {
    this.$accessor.queryIsMobile()
  }
}
</script>

<style lang="less" scoped>
.mobile {
  .link-menu {
    span {
      display: inline-block;
      width: 100%;
      text-align: center;
      font-size: 14px;
      color: #84879c;
      padding-top: 16px;
    }
  }

  .icon_list {
    text-align: center;
    margin: 48px 0;
  }

  .logo {
    text-align: center;
    margin-bottom: 50px;
  }
}

.pc {
  display: flex;
  justify-content: space-between;

  .link-menu {
    a {
      display: inline-block;
      width: 100px;
      text-align: center;
      font-size: 14px;
      color: #84879c;

      &:hover {
        color: #fff;
      }
    }
  }
}
</style>
