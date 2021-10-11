<template>
    <div>
        <Button :disabled="$accessor.metamask.connected" ghost @click="connectMetamask">
          <template v-if="!$accessor.metamask.connected"> Connect Metamask </template>
          <template v-else>{{$accessor.metamask.balance}}</template>
        </Button>
    </div>
</template>
<script lang='ts'>

import { Vue} from 'nuxt-property-decorator'
import { Button, Modal } from 'ant-design-vue'

Vue.use(Modal)

export default Vue.extend({
  components: {
    Button
  },
  props: {
    userMessage: {
      type: String,
      default: "null",
    },
  },
  data() {
    return {
    };
  },
  mounted() {
    this.connectMetamask();
  },
  methods: {
    connectMetamask(){
      // @ts-ignore
      this.$accessor.metamask.connectMetamask();
    },
  },

});
</script>

<style lang="less">
@import '../styles/variables';

.ant-modal-content {
  background-color: @modal-header-bg;

  .ant-modal-close {
    color: @text-color;
  }
}

.select-wallet {
  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30px;
    width: 100%;
    height: 48px;
    text-align: left;
    background-color:blue;
    img {
      height: 32px;
      width: 32px;
      border-radius: 50%;
    }
  }


}
</style>

<style lang="less" scoped>
.wallet-info {
  text-align: center;

  .address {
    font-size: 17px;
  }
}
.tx-history-panel {
  h2 {
    margin-top: 32px;
    text-align: left;
  }
  .tx-item {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .extra-info {
      font-size: 0.9em;
      opacity: 0.8;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;

      a {
        font-size: 1.2em;
      }

      .icon {
        margin-right: 8px;
      }
    }
    .extra-info.time {
      flex-shrink: 0;
    }
  }
}
</style>
