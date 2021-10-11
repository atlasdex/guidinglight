<template>
  <div class="swap container">
    <div class="page-head fs-container">
      <span class="title">Cross-Chain Swap</span>
      <div class="buttons">
        <Tooltip placement="bottomRight">
          <template slot="title">
            <span>
              Displayed data will auto-refresh after
              {{ autoRefreshTime - countdown }} seconds. Click this circle to update manually.
            </span>
          </template>
          <Progress
            type="circle"
            :width="20"
            :stroke-width="10"
            :percent="(100 / autoRefreshTime) * countdown"
            :show-info="false"
            :class="marketAddress && loading ? 'disabled' : ''"
            @click="
              () => {
                getOrderBooks()
                $accessor.wallet.getTokenAccounts()
              }
            "
          />
        </Tooltip>
        <Tooltip placement="bottomRight">
          <template slot="title">
            <p>Program Addresses (DO NOT DEPOSIT)</p>
            <div class="swap-info">
              <div v-if="fromCoin" class="info">
                <div class="symbol">{{ fromCoin.symbol }}</div>
                <div class="address">
                  {{ fromCoin.mintAddress.substr(0, 14) }}
                  ...
                  {{ fromCoin.mintAddress.substr(fromCoin.mintAddress.length - 14, 14) }}
                </div>
                <div class="action">
                  <Icon type="copy" @click="$accessor.copy(fromCoin.mintAddress)" />
                  <a :href="`${url.explorer}/token/${fromCoin.mintAddress}`" target="_blank">
                    <Icon type="link" />
                  </a>
                </div>
              </div>
              <div v-if="midCoinStable" class="info">
                <div class="symbol">{{ midCoinStable.symbol }}</div>
                <div class="address">
                  {{ midCoinStable.mintAddress.substr(0, 14) }}
                  ...
                  {{ midCoinStable.mintAddress.substr(midCoinStable.mintAddress.length - 14, 14) }}
                </div>
                <div class="action">
                  <Icon type="copy" @click="$accessor.copy(midCoinStable.mintAddress)" />
                  <a :href="`${url.explorer}/token/${midCoinStable.mintAddress}`" target="_blank">
                    <Icon type="link" />
                  </a>
                </div>
              </div>
              <div v-if="marketAddress" class="info">
                <div class="symbol">Market</div>
                <div class="address">
                  {{ marketAddress.substr(0, 14) }}
                  ...
                  {{ marketAddress.substr(marketAddress.length - 14, 14) }}
                </div>
                <div class="action">
                  <Icon type="copy" @click="$accessor.copy(marketAddress)" />
                  <a v-if="!officialPool" :href="`${url.explorer}/account/${marketAddress}`" target="_blank">
                    <Icon type="link" />
                  </a>
                  <a v-else :href="`${url.trade}/${marketAddress}`" target="_blank">
                    <Icon type="link" />
                  </a>
                </div>
              </div>
              <div v-if="ammId" class="info">
                <div class="symbol">AMM ID</div>
                <div class="address">
                  {{ ammId ? ammId.substr(0, 14) : '' }}
                  ...
                  {{ ammId ? ammId.substr(ammId.length - 14, 14) : '' }}
                </div>
                <div class="action">
                  <Icon type="copy" @click="$accessor.copy(ammId)" />
                  <a :href="`${url.explorer}/account/${ammId}`" target="_blank">
                    <Icon type="link" />
                  </a>
                </div>
              </div>
            </div>
          </template>
          <Icon type="info-circle" />
        </Tooltip>
        <Icon type="setting" @click="$accessor.setting.open" />
      </div>
    </div>

    <CoinSelect v-if="coinSelectShow" @onClose="() => (coinSelectShow = false)" @onSelect="onCoinSelect" />
    <AmmIdSelect
      :show="ammIdSelectShow"
      :liquidity-list="ammIdSelectList"
      :user-close="true"
      @onClose="() => ((ammIdSelectShow = false), (ammIdSelectOld = true))"
      @onSelect="onAmmIdSelect"
    />

    <UnofficialPoolConfirmUser
      v-if="userCheckUnofficialShow"
      @onClose="() => (userCheckUnofficialShow = false)"
      @onSelect="onUserCheckUnofficialSelect"
    />

    <InputAmmIdOrMarket
      v-if="ammIdOrMarketSearchShow"
      @onClose="() => (ammIdOrMarketSearchShow = false)"
      @onInput="onAmmIdOrMarketInput"
    ></InputAmmIdOrMarket>

    <div class="card">
      <div class="card-body">
        <CoinInput
          v-model="fromCoinAmount"
          label="From"
          :balance-offset="fromCoin && fromCoin.symbol === 'SOL' ? -0.05 : 0"
          :mint-address="fromCoin ? fromCoin.mintAddress : ''"
          :coin-name="fromCoin ? fromCoin.symbol : ''"
          :balance="fromCoin ? fromCoin.balance : null"
          :show-half="true"
          @onInput="(amount) => (fromCoinAmount = amount)"
          @onFocus="
            () => {
              fixedFromCoin = true
            }
          "
          @onMax="
            () => {
              fixedFromCoin = true
              fromCoinAmount = fromCoin && fromCoin.balance ? fromCoin.balance.fixed() : '0'
            }
          "
          @onSelect="openFromCoinSelect"
        />

        <!--<div class="change-side fc-container">
          <div class="fc-container" @click="changeCoinPosition">
            <Icon type="swap" :rotate="90" />
          </div>
        </div>-->

        <CoinInput
          v-model="best_midCoinStableAmount"
          label="To (Estimated by the best DeFi)"
          :mint-address="midCoinStable ? midCoinStable.mintAddress : ''"
          :coin-name="midCoinStable ? midCoinStable.symbol : ''"
          :balance="midCoinStable ? midCoinStable.balance : null"
          :show-max="false"
          :disabled="true"
          :token-disabled = "true"
          @onInput="(amount) => (best_midCoinStableAmount = amount)"
          @onFocus="
            () => {
              fixedFromCoin = false
            }
          "
          @onMax="
            () => {
              fixedFromCoin = false
              best_midCoinStableAmount = midCoinStable.balance.fixed()
            }
          "
          @onSelect="openmidCoinStableSelect"
        />
        <CoinInput
          v-model="best_midCoinStableAmount"
          label="To (Estimated by Stable Pool)"
          :mint-address="midCoinWormhole ? midCoinWormhole.mintAddress : ''"
          :coin-name="midCoinWormhole ? midCoinWormhole.symbol : ''"
          :balance="midCoinWormhole ? midCoinWormhole.balance : null"
          :show-max="false"
          :disabled="true"
          :token-disabled = "true"
          @onInput="(amount) => (best_midCoinStableAmount = amount)"
          @onFocus="
            () => {
              fixedFromCoin = false
            }
          "
          @onMax="
            () => {
              fixedFromCoin = false
              best_midCoinStableAmount = midCoinWormhole.balance.fixed()
            }
          "
          @onSelect="openmidCoinWormholeSelect"
        />
        <CoinInput
          v-model="best_midCoinStableAmount"
          label="To (ERC20 Token)"
          :mint-address="midCoin3 ? midCoin3.mintAddress : ''"
          :coin-name="midCoin3 ? midCoin3.symbol : ''"
          :balance="midCoin3 ? midCoin3.balance : null"
          :show-max="false"
          :disabled="true"
          :token-disabled = "true"
          @onInput="(amount) => (best_midCoinStableAmount = amount)"
          @onFocus="
            () => {
              fixedFromCoin = false
            }
          "
          @onMax="
            () => {
              fixedFromCoin = false
              best_midCoinStableAmount = midCoin3.balance.fixed()
            }
          "
          @onSelect="openMidCoin3Select"
        />
        <div class="price-info" style="padding: 0 12px">
          <div v-if="fromCoin && midCoinStable && isWrap && fromCoinAmount" class="price-base fc-container">
            <span>
              1 {{ fromCoin.symbol }} = 1
              {{ midCoinStable.symbol }}
            </span>
          </div>
          <div v-else-if="fromCoin && midCoinStable && lpMintAddress && fromCoinAmount" class="price-base fc-container">
            <span>
              1 {{ hasPriceSwapped ? midCoinStable.symbol : fromCoin.symbol }} ≈
              {{ hasPriceSwapped ? (1 / best_outToPirceValue).toFixed(6) : best_outToPirceValue }}
              {{ hasPriceSwapped ? fromCoin.symbol : midCoinStable.symbol }}
              <Icon type="swap" @click="() => (hasPriceSwapped = !hasPriceSwapped)" />
            </span>
          </div>
          <div
            v-else-if="fromCoin && midCoinStable && marketAddress && market && asks && bids && fromCoinAmount"
            class="price-base fc-container"
          >
            <span>
              1 {{ hasPriceSwapped ? midCoinStable.symbol : fromCoin.symbol }} ≈
              {{ hasPriceSwapped ? (1 / best_outToPirceValue).toFixed(6) : best_outToPirceValue }}
              {{ hasPriceSwapped ? fromCoin.symbol : midCoinStable.symbol }}
              <Icon type="swap" @click="() => (hasPriceSwapped = !hasPriceSwapped)" />
            </span>
          </div>
          <div class="fs-container">
            <span class="name">
              Slippage Tolerance
              <Tooltip placement="right">
                <template slot="title">
                  The maximum difference between your estimated price and execution price.
                </template>
                <Icon type="question-circle" /> </Tooltip
            ></span>
            <span> {{ $accessor.setting.slippage }}% </span>
          </div>
          <div v-for="price in prices" :key="price.endpoint">
            <div v-if="price.endpoint" class="fs-container">
              <span class="name"> {{ price.endpoint }}</span>
              <span style="text-transform: capitalize"> {{price.midCoinStableAmount}}</span>
              <span style="text-transform: capitalize"> {{price.midCoinStableWithSlippage.fixed()}}</span>
              <span style="text-transform: capitalize"> {{midCoinStable.symbol}}</span>
            </div>
          </div>
          <div v-if="best_endpoint" class="fc-container">
            <span class="text-transform: capitalize"> Best DeFi to swap</span>
          </div>
          <div v-if="best_endpoint" class="fs-container">
            <span class="name"> {{ best_endpoint }}</span>
            <span style="text-transform: capitalize"> {{best_midCoinStableAmount}} {{midCoinStable.symbol}}</span>
          </div>

          <div v-if="fromCoin && midCoinStable && fromCoinAmount && best_midCoinStableWithSlippage" class="fs-container">
            <span class="name">
              Minimum Received
              <Tooltip placement="right">
                <template slot="title"> The least amount of tokens you will recieve on this trade </template>
                <Icon type="question-circle" /> </Tooltip
            ></span>
            <span> {{ best_midCoinStableWithSlippage }} {{ midCoinStable.symbol }} </span>
          </div>
          <div
            v-if="best_endpoint"
            :class="`fs-container price-impact ${
              best_priceImpact > 10 ? 'error-style' : best_priceImpact > 5 ? 'warning-style' : ''
            }`"
          >
            <span class="name">
              Price Impact {{ best_priceImpact > 5 ? 'Warning' : '' }}
              <Tooltip placement="right">
                <template slot="title">
                  The difference between the market price and estimated price due to trade size
                </template>
                <Icon type="question-circle" style="cursor: pointer" /> </Tooltip
            ></span>
            <span :style="`color: ${best_priceImpact <= 5 ? '#31d0aa' : ''}`"> {{ best_priceImpact.toFixed(2) }}% </span>
          </div>
        </div>

        <div v-if="officialPool === false">
          <div style="margin: 10px">
            <div>AMM ID:</div>
            <div>
              {{ ammId ? ammId.substr(0, 14) : '' }}
              ...
              {{ ammId ? ammId.substr(ammId.length - 14, 14) : '' }}
            </div>
          </div>
        </div>
        <Button v-if="!wallet.connected" size="large" ghost @click="$accessor.wallet.openModal">
          Connect Wallet
        </Button>

        <Button
          v-else-if="!(officialPool || (!officialPool && userCheckUnofficial))"
          size="large"
          ghost
          @click="
            () => {
              setTimeout(() => {
                userCheckUnofficialShow = true
              }, 1)
            }
          "
        >
          Confirm Risk Warning
        </Button>
        <Button
          v-else
          size="large"
          ghost
          :disabled="
            !fromCoin ||
            !fromCoinAmount ||
            !midCoinStable ||
            (!marketAddress && !lpMintAddress && !isWrap) ||
            !initialized ||
            loading ||
            gt(
              fromCoinAmount,
              fromCoin && fromCoin.balance
                ? fromCoin.symbol === 'SOL'
                  ? fromCoin.balance.toEther().minus(0.05).toFixed(fromCoin.balance.decimals)
                  : fromCoin.balance.fixed()
                : '0'
            ) || // not enough SOL to swap SOL to another coin
            (get(liquidity.infos, `${lpMintAddress}.status`) &&
              get(liquidity.infos, `${lpMintAddress}.status`) !== 1) ||
            swaping ||
            (fromCoin.mintAddress === TOKENS.xCOPE.mintAddress && gt(5, fromCoinAmount)) ||
            (midCoinStable.mintAddress === TOKENS.xCOPE.mintAddress && gt(5, best_midCoinStableAmount))
          "
          :loading="swaping"
          style="width: 100%"
          :class="`swap-btn ${best_priceImpact > 10 ? 'error-style' : best_priceImpact > 5 ? 'warning-style' : ''}`"
          @click="
            () => {
              if (best_priceImpact > 10) {
                confirmModalIsOpen = true
              } else {
                placeOrder()
              }
            }
          "
        >
          <template v-if="!fromCoin || !midCoinStable"> Select a token </template>
          <template v-else-if="(!marketAddress && !lpMintAddress && !isWrap) || !initialized">
            Pool Not Found
          </template>
          <template v-else-if="!fromCoinAmount"> Enter an amount </template>
          <template v-else-if="loading"> Updating price information </template>
          <template
            v-else-if="
              gt(
                fromCoinAmount,
                fromCoin && fromCoin.balance
                  ? fromCoin.symbol === 'SOL'
                    ? fromCoin.balance.toEther().minus(0.05).toFixed(fromCoin.balance.decimals)
                    : fromCoin.balance.fixed()
                  : '0'
              )
            "
          >
            Insufficient {{ fromCoin.symbol }} balance
          </template>
          <template
            v-else-if="
              get(liquidity.infos, `${lpMintAddress}.status`) && get(liquidity.infos, `${lpMintAddress}.status`) !== 1
            "
          >
            Pool coming soon
          </template>
          <template v-else-if="fromCoin.mintAddress === TOKENS.xCOPE.mintAddress && gt(5, fromCoinAmount)">
            xCOPE amount must greater than 5
          </template>
          <template v-else-if="midCoinStable.mintAddress === TOKENS.xCOPE.mintAddress && gt(5, best_midCoinStableAmount)">
            xCOPE amount must greater than 5
          </template>
          <template v-else>{{ isWrap ? 'Unwrap' : best_priceImpact > 5 ? 'Swap Anyway' : 'Swap' }}</template>
        </Button>
        <div v-if="solBalance && +solBalance.balance.fixed() - 0.05 <= 0" class="not-enough-sol-alert">
          <span class="caution-text">Caution: Your SOL balance is low</span>

          <Tooltip placement="bottomLeft">
            <template slot="title">
              SOL is needed for Solana network fees. A minimum balance of 0.05 SOL is recommended to avoid failed
              transactions.
            </template>
            <Icon type="question-circle" />
          </Tooltip>
        </div>
        <div v-if="swaping" class="not-enough-sol-alert">
          <span class="caution-text">{{progressText}}</span>
        </div>
      </div>
    </div>

    <div
      v-if="(!baseSymbol && !quoteSymbol && isFetchingUnsettled) || baseUnsettledAmount || quoteUnsettledAmount"
      class="card extra"
    >
      <div class="settle card-body">
        <div v-if="!baseSymbol && !quoteSymbol && isFetchingUnsettled" class="fetching-unsettled">
          <Spin :spinning="true">
            <Icon slot="indicator" type="loading" style="font-size: 24px" spin />
          </Spin>
          <span>Fetching info from market. Please wait.</span>
        </div>

        <table
          v-else-if="(baseSymbol && quoteSymbol && !isFetchingUnsettled && baseUnsettledAmount) || quoteUnsettledAmount"
          class="settel-panel"
        >
          <thead>
            <tr>
              <th colspan="2">You have unsettled balances:</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="baseSymbol && baseUnsettledAmount" class="row">
              <td>{{ baseSymbol }}</td>
              <td>{{ baseUnsettledAmount }}</td>
              <td class="align-right" rowspan="2">
                <Button class="btn" :loading="isSettlingBase" ghost @click="settleFunds('base')">Settle</Button>
              </td>
            </tr>

            <tr v-if="quoteSymbol && quoteUnsettledAmount" class="row">
              <td>{{ quoteSymbol }}</td>
              <td>{{ quoteUnsettledAmount }}</td>
              <td v-if="!baseUnsettledAmount" class="align-right" rowspan="2">
                <Button class="btn" :loading="isSettlingBase" ghost @click="settleFunds('base')">Settle</Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal
      class="swap-confirm-modal"
      title="Warning"
      :visible="confirmModalIsOpen === true"
      :footer="null"
      @cancel="confirmModalIsOpen = false"
      @ok="
        () => {
          confirmModalIsOpen = false
          placeOrder()
        }
      "
    >
      <div class="title">Price Impact Warning</div>
      <div class="description">
        Your swap is large relative to liquidity in the pool. Price impact is
        <span class="highlight">higher than 10%</span>. If you're unsure what to do, read about price impact
        <a
          href="https://raydium.gitbook.io/raydium/trading-on-serum/faq#what-is-price-impact"
          rel="nofollow noopener noreferrer"
          target="_blank"
        >
          here</a
        >.
      </div>
      <div class="description-secondary">Are you sure you want to confirm this swap?</div>
      <div class="btn-group">
        <Button class="cancel-btn" ghost size="large" @click="confirmModalIsOpen = false"> Cancel </Button>
        <Button
          class="swap-btn"
          type="text"
          @click="
            () => {
              confirmModalIsOpen = false
              placeOrder()
            }
          "
        >
          Swap anyway
        </Button>
      </div>
    </Modal>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex'
import { Icon, Tooltip, Button, Progress, Spin, Modal } from 'ant-design-vue'

import { cloneDeep, get } from 'lodash-es'
import { Market, Orderbook } from '@project-serum/serum/lib/market.js'

import { PublicKey } from '@solana/web3.js'
import {
  CHAIN_ID_ETH,
  CHAIN_ID_SOLANA,
} from "@certusone/wormhole-sdk"
import { zeroPad } from "@ethersproject/bytes"
import { uint8ArrayToHex, hexToUint8Array } from "@/utils/wormhole/array"

import { getTokenBySymbol, TokenInfo, NATIVE_SOL, TOKENS } from '@/utils/tokens'
import { inputRegex, escapeRegExp } from '@/utils/regex'
import { getMultipleAccounts, commitment } from '@/utils/web3'
import { SERUM_PROGRAM_ID_V3 } from '@/utils/ids'
import { TokenAmount, gt } from '@/utils/safe-math'
import { getUnixTs } from '@/utils'
import { canWrap, getLiquidityInfoSimilar } from '@/utils/liquidity'

import { getOutAmount, getSwapOutAmount, place as serumPlace, swap as raydiumSwap, wrap, checkUnsettledInfo, settleFund } from '@/utils/swap'
import {stableSwap, STABLE_POOLS} from '@/utils/stable_swap'
import {crossTransfer, redeemToken} from '@/utils/wormhole' 

import {
  getLpListByTokenMintAddresses,
  getPoolListByTokenMintAddresses,
  isOfficalMarket,
  LiquidityPoolInfo
} from '@/utils/pools'

const StartToken = getTokenBySymbol('USDC')
const MidTokenStable = getTokenBySymbol('USDT')
const MidTokenWormhole = getTokenBySymbol('wUSDTv2')
const MidTokenERCWormhole = getTokenBySymbol('USDT')
interface PriceInfo {
  endpoint:string
  midCoinStableAmount:string,
  midCoinStableWithSlippage:TokenAmount,
  price:number,
  priceImpact:number
}

export default Vue.extend({
  components: {
    Icon,
    Tooltip,
    Button,
    Progress,
    Spin,
    Modal
  },

  data() {
    return {
      TOKENS,

      // should check if user have enough SOL to have a swap
      solBalance: null as TokenAmount | null,

      autoRefreshTime: 60,
      countdown: 0,
      marketTimer: null as any,
      initialized: false,
      loading: false,
      // swaping
      swaping: false,
      asks: {} as any,
      bids: {} as any,

      isFetchingUnsettled: false,
      unsettledOpenOrders: null as any,

      // whether have symbol will
      baseSymbol: '',
      baseUnsettledAmount: 0,
      isSettlingBase: false,

      quoteSymbol: '',
      quoteUnsettledAmount: 0,
      isSettlingQuote: false,

      coinSelectShow: false,
      coinIndex: 0,
      fixedFromCoin: true,

      fromCoin: StartToken as TokenInfo | null,
      midCoinStable: MidTokenStable as TokenInfo | null,
      midCoinWormhole: MidTokenWormhole as TokenInfo | null,
      midCoin3: MidTokenERCWormhole as TokenInfo | null,
      fromCoinAmount: '1.2',
      progressText: '',

      best_midCoinStableAmount: '',
      best_midCoinStableWithSlippage: '',
      // trading endpoint
      best_endpoint: '',
      best_priceImpact: 0,
      best_outToPirceValue: 0,

      prices: [] as PriceInfo[],

      // wrap
      isWrap: false,
      // if priceImpact is higher than 10%, a confirm modal will be shown
      confirmModalIsOpen: false,

      // serum
      market: null as any,
      marketAddress: '',
      // amm
      lpMintAddress: '',

      coinBasePrice: true,

      // whether user has toggle swap button
      hasPriceSwapped: false,

      officialPool: true,
      userCheckUnofficial: false,
      userCheckUnofficialMint: undefined as string | undefined,
      userCheckUnofficialShow: false,
      findUrlAmmId: false,

      ammId: undefined as string | undefined,

      ammIdSelectShow: false,
      ammIdSelectList: [] as LiquidityPoolInfo[] | [],

      ammIdSelectOld: false,

      ammIdOrMarketSearchShow: false,

      userNeedAmmIdOrMarket: undefined as string | undefined,

      setCoinFromMintLoading: false,

      asksAndBidsLoading: true
    }
  },

  head: {
    title: 'Atlas Cross-Chain Swap'
  },

  computed: {
    ...mapState(['wallet', 'swap', 'liquidity', 'url', 'setting'])
  },

  watch: {
    fromCoinAmount(newAmount: string, oldAmount: string) {
      this.$nextTick(() => {
        if (!inputRegex.test(escapeRegExp(newAmount))) {
          this.fromCoinAmount = oldAmount
        } else {
          this.updateAmounts()
        }
      })
    },
    'wallet.tokenAccounts': {
      handler(newTokenAccounts: any) {
        this.updateCoinInfo(newTokenAccounts)
        this.findMarket()
        if (this.ammId) {
          this.needUserCheckUnofficialShow(this.ammId)
        }
        if (this.market) {
          this.fetchUnsettledByMarket()
        }
        this.solBalance = this.wallet.tokenAccounts[NATIVE_SOL.mintAddress]
      },
      deep: true
    },

    fromCoin(newCoin, oldCoin) {
      if (
        !this.setCoinFromMintLoading &&
        (oldCoin === null || newCoin === null || newCoin.mintAddress !== oldCoin.mintAddress)
      ) {
        this.userNeedAmmIdOrMarket = undefined
        this.findMarket()
        this.fromCoinAmount = ''
        this.best_midCoinStableAmount = ''
        this.ammIdSelectOld = false
      }
    },

    baseUnsettledAmount() {
      this.isSettlingBase = false
    },

    quoteUnsettledAmount() {
      this.isSettlingQuote = false
    },

    midCoinStable(newCoin, oldCoin) {
      if (
        !this.setCoinFromMintLoading &&
        (oldCoin === null || newCoin === null || newCoin.mintAddress !== oldCoin.mintAddress)
      ) {
        this.userNeedAmmIdOrMarket = undefined
        this.findMarket()
        this.fromCoinAmount = ''
        this.best_midCoinStableAmount = ''
        this.ammIdSelectOld = false
      }
    },

    market() {
      this.baseSymbol = ''
      this.baseUnsettledAmount = 0
      this.quoteSymbol = ''
      this.quoteUnsettledAmount = 0
      this.unsettledOpenOrders = null as any
      this.fetchUnsettledByMarket()
    },

    marketAddress() {
      this.updateAmounts()
    },

    asks() {
      this.updateAmounts()
    },

    bids() {
      this.updateAmounts()
    },

    'liquidity.infos': {
      handler(_newInfos: any) {
        this.updateAmounts()
        const { from, to, ammId } = this.$route.query
        if (this.findUrlAmmId) {
          // @ts-ignore
          this.setCoinFromMint(ammId, from, to)
        }
        this.findMarket()
      },
      deep: true
    },

    'swap.markets': {
      handler(_newInfos: any) {
        this.findMarket()
      },
      deep: true
    },

    'setting.slippage': {
      handler() {
        this.updateAmounts()
      },
      deep: true
    },
    'metamask.connected': {
      handler() {
        this.updateETHBalance()
      },
      deep: true
    },
    'metamask.balance': {
      handler() {
        this.updateETHBalance()
      },
      deep: true
    },
  },

  mounted() {
    this.updateCoinInfo(this.wallet.tokenAccounts)

    this.setMarketTimer()

    const { from, to, ammId } = this.$route.query
    // @ts-ignore
    this.setCoinFromMint(ammId, from, to)
  },

  methods: {
    gt,
    get,

    openFromCoinSelect() {
      this.coinIndex = 0
      this.closeAllModal('coinSelectShow')
      setTimeout(() => {
        this.coinSelectShow = true
      }, 1)
    },

    openmidCoinStableSelect() {
      this.coinIndex = 1
      this.closeAllModal('coinSelectShow')
      setTimeout(() => {
        this.coinSelectShow = true
      }, 1)
    },

    openmidCoinWormholeSelect() {
      this.coinIndex = 2
      this.closeAllModal('coinSelectShow')
      setTimeout(() => {
        this.coinSelectShow = true
      }, 1)
    },
    openMidCoin3Select() {
      this.coinIndex = 3
      this.closeAllModal('coinSelectShow')
      setTimeout(() => {
        this.coinSelectShow = true
      }, 1)
    },

    onCoinSelect(tokenInfo: TokenInfo) {
      if (tokenInfo !== null) {
        if (this.coinIndex === 0) {
          this.fromCoin = cloneDeep(tokenInfo)

          if (this.midCoinStable?.mintAddress === tokenInfo.mintAddress) {
            this.midCoinStable = null
            this.changeCoinAmountPosition()
          }
        } else if (this.coinIndex === 1){
          this.midCoinStable = cloneDeep(tokenInfo)

          if (this.fromCoin?.mintAddress === tokenInfo.mintAddress) {
            this.fromCoin = null
            this.changeCoinAmountPosition()
          }
        } else if (this.coinIndex === 2){
          this.midCoinWormhole = cloneDeep(tokenInfo)

          if (this.fromCoin?.mintAddress === tokenInfo.mintAddress) {
            this.fromCoin = null
            this.changeCoinAmountPosition()
          }
          if (this.midCoinStable?.mintAddress === tokenInfo.mintAddress) {
            this.midCoinStable = null
            this.changeCoinAmountPosition()
          }
        } else if (this.coinIndex === 3){
          this.midCoin3 = cloneDeep(tokenInfo)
        }
      } else {
        // check coin
        if (this.fromCoin !== null) {
          const newFromCoin = Object.values(TOKENS).find((item) => item.mintAddress === this.fromCoin?.mintAddress)
          if (newFromCoin === null || newFromCoin === undefined) {
            this.fromCoin = null

          }
        }
        if (this.midCoinStable !== null) {
          const newmidCoinStable = Object.values(TOKENS).find((item) => item.mintAddress === this.midCoinStable?.mintAddress)
          if (newmidCoinStable === null || newmidCoinStable === undefined) {
            this.midCoinStable = null
          }
        }
        if (this.midCoinWormhole !== null) {
          const newmidCoinWormhole = Object.values(TOKENS).find((item) => item.mintAddress === this.midCoinWormhole?.mintAddress)
          if (newmidCoinWormhole === null || newmidCoinWormhole === undefined) {
            this.midCoinWormhole = null
          }
        }

      }
      this.coinSelectShow = false
    },

    setCoinFromMint(ammIdOrMarket: string | undefined, from: string | undefined, to: string | undefined) {
      this.setCoinFromMintLoading = true
      let fromCoin, midCoinStable
      try {
        this.findUrlAmmId = !this.liquidity.initialized
        this.userNeedAmmIdOrMarket = ammIdOrMarket
        // @ts-ignore
        const liquidityUser = getLiquidityInfoSimilar(ammIdOrMarket, from, to)
        if (liquidityUser) {
          if (from) {
            fromCoin = liquidityUser.coin.mintAddress === from ? liquidityUser.coin : liquidityUser.pc
            midCoinStable = liquidityUser.coin.mintAddress === fromCoin.mintAddress ? liquidityUser.pc : liquidityUser.coin
          }
          if (to) {
            midCoinStable = liquidityUser.coin.mintAddress === to ? liquidityUser.coin : liquidityUser.pc
            fromCoin = liquidityUser.coin.mintAddress === midCoinStable.mintAddress ? liquidityUser.pc : liquidityUser.coin
          }
          if (!(from && to)) {
            fromCoin = liquidityUser.coin
            midCoinStable = liquidityUser.pc
          }
        }
        if (fromCoin || midCoinStable) {
          if (fromCoin) {
            fromCoin.balance = get(this.wallet.tokenAccounts, `${fromCoin.mintAddress}.balance`)
            this.fromCoin = fromCoin
          }

          if (midCoinStable) {
            midCoinStable.balance = get(this.wallet.tokenAccounts, `${midCoinStable.mintAddress}.balance`)
            this.midCoinStable = midCoinStable
          }
        }
      } catch (error) {
        this.$notify.warning({
          message: error.message,
          description: ''
        })
      }
      setTimeout(() => {
        this.setCoinFromMintLoading = false
        this.findMarket()
      }, 1)
    },

    needUserCheckUnofficialShow(ammId: string) {
      if (!this.wallet.connected) {
        return
      }
      if (this.officialPool) {
        return
      }

      const localCheckStr = localStorage.getItem(`${this.wallet.address}--checkAmmId`)
      const localCheckAmmIdList = localCheckStr ? localCheckStr.split('---') : []
      if (localCheckAmmIdList.includes(ammId)) {
        this.userCheckUnofficial = true
        this.userCheckUnofficialMint = ammId
        this.userCheckUnofficialShow = false
        return
      }
      if (this.userCheckUnofficialMint === ammId) {
        this.userCheckUnofficial = true
        this.userCheckUnofficialShow = false
        return
      }
      this.userCheckUnofficial = false
      this.closeAllModal('userCheckUnofficialShow')
      setTimeout(() => {
        this.userCheckUnofficialShow = true
      }, 1)
    },

    onAmmIdSelect(liquidityInfo: LiquidityPoolInfo | undefined) {
      this.ammIdSelectShow = false
      if (liquidityInfo) {
        this.lpMintAddress = liquidityInfo.lp.mintAddress
        this.ammId = liquidityInfo.ammId
        this.userNeedAmmIdOrMarket = this.ammId
        this.officialPool = liquidityInfo.official
        this.findMarket()
      } else {
        this.ammIdSelectOld = true
        this.findMarket()
      }
    },

    onAmmIdOrMarketInput(ammIdOrMarket: string) {
      this.ammIdOrMarketSearchShow = false
      this.setCoinFromMint(ammIdOrMarket, undefined, undefined)
      this.findMarket()
    },

    onUserCheckUnofficialSelect(userSelect: boolean, userSelectAll: boolean) {
      this.userCheckUnofficialShow = false
      if (userSelect) {
        this.userCheckUnofficial = true
        this.userCheckUnofficialMint = this.ammId
        if (userSelectAll) {
          const localCheckStr = localStorage.getItem(`${this.wallet.address}--checkAmmId`)
          if (localCheckStr) {
            localStorage.setItem(`${this.wallet.address}--checkAmmId`, localCheckStr + `---${this.ammId}`)
          } else {
            localStorage.setItem(`${this.wallet.address}--checkAmmId`, `${this.ammId}`)
          }
        }
      } else {
        this.fromCoin = null
        this.midCoinStable = null
        this.ammId = undefined
        this.officialPool = true
      }
    },

    changeCoinPosition() {
      this.setCoinFromMintLoading = true
      const tempFromCoin = this.fromCoin
      const tempmidCoinStable = this.midCoinStable
      setTimeout(() => {
        this.setCoinFromMintLoading = false
      }, 1)

      this.fromCoin = tempmidCoinStable
      this.midCoinStable = tempFromCoin

      this.changeCoinAmountPosition()
    },

    changeCoinAmountPosition() {
      const tempFromCoinAmount = this.fromCoinAmount
      const tempmidCoinStableAmount = this.best_midCoinStableAmount

      this.fromCoinAmount = tempmidCoinStableAmount
      this.best_midCoinStableAmount = tempFromCoinAmount
    },

    updateCoinInfo(tokenAccounts: any) {
      if (this.fromCoin) {
        const fromCoin = tokenAccounts[this.fromCoin.mintAddress]

        if (fromCoin) {
          this.fromCoin = { ...this.fromCoin, ...fromCoin }
        }
      }

      if (this.midCoinStable) {
        const midCoinStable = tokenAccounts[this.midCoinStable.mintAddress]

        if (midCoinStable) {
          this.midCoinStable = { ...this.midCoinStable, ...midCoinStable }
        }
      }
      if (this.midCoinWormhole) {
        const midCoinWormhole = tokenAccounts[this.midCoinWormhole.mintAddress]

        if (midCoinWormhole) {
          this.midCoinWormhole = { ...this.midCoinWormhole, ...midCoinWormhole }
        }
      }
    },

    findMarket() {
      if (this.fromCoin && this.midCoinStable && this.liquidity.initialized) {
        const InputAmmIdOrMarket = this.userNeedAmmIdOrMarket

        // let userSelectFlag = false
        // wrap & unwrap
        if (canWrap(this.fromCoin.mintAddress, this.midCoinStable.mintAddress)) {
          this.isWrap = true
          this.initialized = true
          this.officialPool = true
          this.ammId = undefined
          return
        }

        let marketAddress = ''

        // serum
        for (const address of Object.keys(this.swap.markets)) {
          if (isOfficalMarket(address)) {
            const info = cloneDeep(this.swap.markets[address])
            let fromMint = this.fromCoin.mintAddress
            let toMint = this.midCoinStable.mintAddress
            if (fromMint === NATIVE_SOL.mintAddress) {
              fromMint = TOKENS.WSOL.mintAddress
            }
            if (toMint === NATIVE_SOL.mintAddress) {
              toMint = TOKENS.WSOL.mintAddress
            }
            if (
              (info.baseMint.toBase58() === fromMint && info.quoteMint.toBase58() === toMint) ||
              (info.baseMint.toBase58() === toMint && info.quoteMint.toBase58() === fromMint)
            ) {
              // if (!info.baseDepositsTotal.isZero() && !info.quoteDepositsTotal.isZero()) {
              marketAddress = address
              // }
            }
          }
        }

        if (this.fromCoin.mintAddress && this.midCoinStable.mintAddress) {
          const liquidityListV4 = getPoolListByTokenMintAddresses(
            this.fromCoin.mintAddress === TOKENS.WSOL.mintAddress ? NATIVE_SOL.mintAddress : this.fromCoin.mintAddress,
            this.midCoinStable.mintAddress === TOKENS.WSOL.mintAddress ? NATIVE_SOL.mintAddress : this.midCoinStable.mintAddress,
            typeof InputAmmIdOrMarket === 'string' ? InputAmmIdOrMarket : undefined
          )
          const liquidityListV3 = getLpListByTokenMintAddresses(
            this.fromCoin.mintAddress === TOKENS.WSOL.mintAddress ? NATIVE_SOL.mintAddress : this.fromCoin.mintAddress,
            this.midCoinStable.mintAddress === TOKENS.WSOL.mintAddress ? NATIVE_SOL.mintAddress : this.midCoinStable.mintAddress,
            typeof InputAmmIdOrMarket === 'string' ? InputAmmIdOrMarket : undefined,
            [3]
          )

          let lpMintAddress
          let ammId
          let officialPool = true
          if (liquidityListV4.length === 1 && !liquidityListV4[0].official && liquidityListV3.length > 0) {
            console.log('v3')
          } else if (liquidityListV4.length === 1 && liquidityListV4[0].official) {
            // official
            lpMintAddress = liquidityListV4[0].lp.mintAddress
            ammId = liquidityListV4[0].ammId
            // mark
            officialPool = liquidityListV4[0].official
            this.userCheckUnofficialMint = undefined
            marketAddress = liquidityListV4[0].serumMarket
          } else if (
            marketAddress !== '' &&
            (InputAmmIdOrMarket === undefined || InputAmmIdOrMarket === marketAddress)
          ) {
            console.log('official market')
          } else if (liquidityListV4.length === 1 && InputAmmIdOrMarket) {
            // user select
            ammId = liquidityListV4[0].ammId
            lpMintAddress = liquidityListV4[0].lp.mintAddress
            officialPool = liquidityListV4[0].official
            marketAddress = liquidityListV4[0].serumMarket
          } else if (liquidityListV4.length > 0 && this.ammIdSelectOld) {
            console.log('last user select none')
          } else if (liquidityListV4.length > 0) {
            // user select amm id
            this.coinSelectShow = false
            setTimeout(() => {
              this.ammIdSelectShow = true
              // @ts-ignore
              this.ammIdSelectList = Object.values(this.liquidity.infos).filter((item: LiquidityPoolInfo) =>
                liquidityListV4.find((liquidityItem) => liquidityItem.ammId === item.ammId)
              )
            }, 1)
            return
          }
          this.lpMintAddress = lpMintAddress ?? ''
          this.initialized = true
          this.ammId = ammId
          this.officialPool = officialPool
          if (ammId !== this.userCheckUnofficialMint) {
            this.userCheckUnofficialMint = undefined
          }
          if (ammId) {
            this.needUserCheckUnofficialShow(ammId)
          }
        }

        if (marketAddress) {
          // const lpPool = LIQUIDITY_POOLS.find((item) => item.serumMarket === marketAddress)
          if (this.marketAddress !== marketAddress) {
            this.marketAddress = marketAddress
            this.isWrap = false
            Market.load(this.$web3, new PublicKey(marketAddress), {}, new PublicKey(SERUM_PROGRAM_ID_V3)).then(
              (market) => {
                this.market = market
                this.getOrderBooks()
              }
            )
            // this.unsubPoolChange()
            // this.subPoolChange()
          }
        } 
        this.updateAmounts()
        // else {
        //   this.endpoint = ''
        //   this.marketAddress = ''
        //   this.market = null
        //   this.lpMintAddress = ''
        //   this.isWrap = false
        //   // this.unsubPoolChange()
        // }
        this.updateUrl()
      } else {
        this.ammId = undefined
        this.best_endpoint = ''
        this.prices = []
        this.marketAddress = ''
        this.market = null
        this.lpMintAddress = ''
        this.isWrap = false
        // this.unsubPoolChange()
      }
    },

    getOrderBooks() {
      this.loading = true
      this.asksAndBidsLoading = true
      this.countdown = this.autoRefreshTime

      const conn = this.$web3
      if (this.marketAddress && get(this.swap.markets, this.marketAddress)) {
        const marketInfo = get(this.swap.markets, this.marketAddress)
        const { bids, asks } = marketInfo

        getMultipleAccounts(conn, [bids, asks], commitment)
          .then((infos) => {
            infos.forEach((info) => {
              // @ts-ignore
              const data = info.account.data

              const orderbook = Orderbook.decode(marketInfo, data)

              const { isBids, slab } = orderbook

              if (isBids) {
                this.bids = slab
              } else {
                this.asks = slab
              }
              this.asksAndBidsLoading = false
            })
          })
          .finally(() => {
            this.initialized = true
            this.loading = false
            this.countdown = 0
          })
      } else {
        this.loading = false
      }
    },

    updateAmounts() {
      this.prices = []
      let found = false
      if (this.fromCoin && this.midCoinStable && this.isWrap && this.fromCoinAmount) {
        // wrap & unwrap
        this.best_midCoinStableAmount = this.fromCoinAmount
        return
      }
      if (this.fromCoin && this.midCoinStable && this.ammId && this.fromCoinAmount) {
        // amm
        const poolInfo = Object.values(this.$accessor.liquidity.infos).find((p: any) => p.ammId === this.ammId)
        const { amountOut, amountOutWithSlippage
        , priceImpact
         } = getSwapOutAmount(
          poolInfo,
          this.fromCoin.mintAddress,
          this.midCoinStable.mintAddress,
          this.fromCoinAmount,
          this.setting.slippage
        )
        if (!amountOut.isNullOrZero()) {
          // console.log(`input: ${this.fromCoinAmount} raydium out: ${amountOutWithSlippage.fixed()}`)
          const endpoint = 'Raydium Pool'
          const midCoinStableAmount = amountOut.fixed()
          const midCoinStableWithSlippage = amountOutWithSlippage
          const price = +new TokenAmount(
            parseFloat(midCoinStableAmount) / parseFloat(this.fromCoinAmount),
            this.midCoinStable.decimals,
            false
          ).fixed()
          const curPrice: PriceInfo  = {
            endpoint,
            midCoinStableAmount,
            midCoinStableWithSlippage,
            price,
            priceImpact
          }
          this.prices.push(curPrice)
          found = true
        }
      }
      if (
        this.fromCoin &&
        this.midCoinStable &&
        this.marketAddress &&
        this.market &&
        this.asks &&
        this.bids &&
        this.fromCoinAmount &&
        !this.asksAndBidsLoading
      ) {
        // serum
        const { amountOut, amountOutWithSlippage
        , priceImpact 
        } = getOutAmount(
          this.market,
          this.asks,
          this.bids,
          this.fromCoin.mintAddress,
          this.midCoinStable.mintAddress,
          this.fromCoinAmount,
          this.setting.slippage
        )

        const out = new TokenAmount(amountOut, this.midCoinStable.decimals, false)
        const outWithSlippage = new TokenAmount(amountOutWithSlippage, this.midCoinStable.decimals, false)

        if (!out.isNullOrZero()) {
          console.log(`input: ${this.fromCoinAmount}   serum out: ${outWithSlippage.fixed()}`)
          const endpoint = 'Serum Dex'
          const midCoinStableAmount = out.fixed()
          const midCoinStableWithSlippage = outWithSlippage
          const price = +new TokenAmount(
            parseFloat(midCoinStableAmount) / parseFloat(this.fromCoinAmount),
            this.midCoinStable.decimals,
            false
          ).fixed()
          const curPrice: PriceInfo = {
            endpoint,
            midCoinStableAmount,
            midCoinStableWithSlippage,
            price,
            priceImpact
          }
          this.prices.push(curPrice)
          found = true

        }
      }
      if(found){
        this.best_midCoinStableAmount = "0"
        this.prices.forEach((item:PriceInfo)=>{

          if(parseFloat(item.midCoinStableAmount) > parseFloat(this.best_midCoinStableAmount))
          {
            this.best_midCoinStableAmount = item.midCoinStableAmount
            this.best_midCoinStableWithSlippage = item.midCoinStableWithSlippage.fixed()
            this.best_outToPirceValue = item.price
            this.best_priceImpact = item.priceImpact
            this.best_endpoint = item.endpoint
          }
        })
      }
      else{
        this.best_midCoinStableAmount = ''
        this.best_midCoinStableWithSlippage = ''
        this.best_outToPirceValue = 0
        this.best_priceImpact = 0
        this.best_endpoint = ''
      }
    },
    updateETHBalance(){
      console.log("Connected Metamask")
    },
    setMarketTimer() {
      this.marketTimer = setInterval(() => {
        if (!this.loading) {
          if (this.countdown < this.autoRefreshTime) {
            this.countdown += 1

            if (this.countdown === this.autoRefreshTime) {
              this.getOrderBooks()
            }
          }
        }
      }, 1000)
    },
    doWormholeRedeem(signedVAAHex:string){

      const key = getUnixTs().toString()

      const signedVAA = hexToUint8Array(signedVAAHex)
      this.progressText = "Redeeming from wormhole"

      const targetChain = CHAIN_ID_ETH // target chain
      // @ts-ignore
      const signer = this.$accessor.metamask.signer // signer 
      const solanaWallet = this.$wallet // solana wallet
      const terraWallet = null // terra wallet

      redeemToken(
        targetChain,
        signedVAA,
        signer,
        solanaWallet,
        terraWallet
        ).then((res:any)=>{
          if(res)
          {
            const txid = res.id
            this.$notify.info({
                key,
                message: 'Redeeming is finished',
                description: (h: any) =>
                  h('div', [
                    'Confirmation is in progress.  Check your transaction on ',
                    h('a', { attrs: { href: `${this.url.explorer}/tx/${txid}`, target: '_blank' } }, 'here')
                  ])
              })

            const description = `Transfer confirmed`
            this.$accessor.transaction.sub({ txid, description })

          }
        }) .catch((error)=>{
          this.$notify.error({
            key,
            message: 'Redeem failed',
            description: error.message
          })
          console.log(error)
        }).finally(()=>{
          this.swaping = false
        })

    },
    doWormholeTransfer(amountIncreased:string){

      const key = getUnixTs().toString()

      this.progressText = "Transfering via wormhole"
      const sourceToken = this.midCoinWormhole

      // @ts-ignore
      const tokenAccount = this.wallet.tokenAccounts[sourceToken.mintAddress]
      tokenAccount.publicKey = tokenAccount.tokenAccountAddress
      const erc20USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
      // @ts-ignore
      tokenAccount.decimals = sourceToken.decimals

      const sourceChain = CHAIN_ID_SOLANA // source chain
      // @ts-ignore
      const sourceAsset = sourceToken.mintAddress // source asset
  
      // from SPL USDT to ERC20 wUSDTv2
      let originChain = CHAIN_ID_SOLANA  // for USDT
      // @ts-ignore
      let originAsset = this.$accessor.metamask.address // origin asset  will be changed by the token mint
      
      // @ts-ignore
      if(sourceToken.mintAddress === MidTokenWormhole.mintAddress)
      {
        // from SPL wUSDTv2 ->ERC20 USDT
        originChain = CHAIN_ID_ETH  
        originAsset = uint8ArrayToHex(zeroPad(hexToUint8Array(erc20USDT.slice(2)), 32)) // origin asset  will be changed by the token mint
      }
      const amount = amountIncreased // amount
      const targetChain = CHAIN_ID_ETH // target chain
      // @ts-ignore
      const targetAddress = zeroPad(hexToUint8Array(this.$accessor.metamask.address.slice(2)), 32) // target address
      // @ts-ignore
      const signer = this.$accessor.metamask.signer // signer 
      const solanaWallet = this.$wallet // solana wallet
      const terraWallet = null // terra wallet
      const sourceParsedTokenAccount = tokenAccount // source parsed token account

      crossTransfer(
        sourceChain, // source chain
        // @ts-ignore
        sourceAsset, // source asset
        originChain, // origin chain
        // @ts-ignore
        originAsset, // origin asset
        amount, // amount
        targetChain, // target chain
        // @ts-ignore
        targetAddress, // target address
        signer, // signer 
        solanaWallet, // solana wallet
        terraWallet, // terra wallet
        sourceParsedTokenAccount // source parsed token account
      ).then((signedVAA)=>{
        console.log("---\n", signedVAA, "---\n",)
        if(signedVAA)
        {
          this.doWormholeRedeem(signedVAA)
        }
        else
        {
          this.swaping = false
        }
      }).catch((error)=>{
        this.$notify.error({
          key,
          message: 'Cross transfer failed',
          description: error.message
        })
        console.log(error)
        this.swaping = false
      })
    },
    doStableSwap(amountIncreased:string){
      const key = getUnixTs().toString()
      this.progressText = "Swaping via Atlas stable pool"
      stableSwap(
        this.$web3,
        // @ts-ignore
        this.$wallet,
        STABLE_POOLS.USDT,
        // @ts-ignore
        this.midCoinStable.mintAddress,
        // @ts-ignore
        this.midCoinWormhole.mintAddress,
        // @ts-ignore
        get(this.wallet.tokenAccounts, `${this.midCoinStable.mintAddress}.tokenAccountAddress`),
        // @ts-ignore
        get(this.wallet.tokenAccounts, `${this.midCoinWormhole.mintAddress}.tokenAccountAddress`),
        amountIncreased,
        '0'
      )
      .then(({txid, amountIncreased}) => {
        this.$notify.info({
          key,
          message: 'Transaction has been sent',
          description: (h: any) =>
            h('div', [
              'Confirmation is in progress.  Check your transaction on ',
              h('a', { attrs: { href: `${this.url.explorer}/tx/${txid}`, target: '_blank' } }, 'here')
            ])
        })

        const description = `Swap ${amountIncreased} ${this.midCoinStable?.symbol} to ${this.best_midCoinStableAmount} ${this.midCoinWormhole?.symbol}`
        this.$accessor.transaction.sub({ txid, description })
        this.doWormholeTransfer(amountIncreased)
      })
      .catch((error) => {
        this.$notify.error({
          key,
          message: 'Stable swap failed',
          description: error.message
        })
        console.log(error)
        this.swaping = false
      })
    },
    placeOrder() {
      this.swaping = true

      const key = getUnixTs().toString()
      this.$notify.info({
        key,
        message: 'Making transaction...',
        description: '',
        duration: 0
      })
      
      this.progressText = "Swaping via " + this.best_endpoint
      // this.doWormholeRedeem("01000000010e00674e9082dae26728fa7d9ce82e3c4a6d553c7d4a3aa1dfece201de88c982b410298d4b3362296f1e204c97a4eae2b36875e7c3da57fafa0d4d913e125611045600016f8cfd8a7e23b1fd24c30f53012b554fd62c5f420ed9e8cf3c6381a01e6310c027bc14beac3cbd46afa3a7d34280c1a90a9ae42f9ab6137f9c1ac6292bf0047e0002eacf81f9eea1a1cbb2c95f9ef696573afbf3e391d7bdef6491984029d69002a174feef02f45cf4409221d3ee1164e22abcce9b1458ab655563e6e3373e1ecd050003d7a831d6976c84a16ccd92a159ce660065e865a74f6b513db150059e970c855479912375d76ac25d14964dc01b45dad26e5ea8254c9a6a513829c224526744de0004c0eab24566ee3dc06ede770426079c6182452e53486a899e0057d79373b94bda302619f423942056cc81e68a6835c5698f5bf176fb60a8f956a49cb27bb4dde400070cea947cd9e2228a43b5d86fd92e9dd6310f27cbf0da40b3d7a7838c442144dd7681425dddb1f3c6d3021fb26af78dc8ec7cbb17dd0f2a94a9e6a009afe2aac80009bfda4000fd630c0f0bfe4b94be996ff9733cd73bf0542b5635fa77268f0a92080252f8c406760c97deb5156a136eda16c07d8e732c2cc5760b917b4cebe69237000a788d3c55cea39a595f473c83f76c7af0d68bf4a2eec41789093f6d5b6711773253150ceb8c015c3f8fb6ac4f1c96cf6e2332fa9708b48abc6fa9b3aa85f7f888000bbd63b7c56dbbf1c5b20c12c70273200025135844de8ee21d2fcef24205e79d583f462d6c124282f276224d46189282bce4da44477e574c002fb1d00328ad0dec000cd94bc6cdaceb061a3a07977561153ef473fac748948240927fae3668e9813b1a54960841d7e7025043616dae3e19aaf117cf67c365c709e45b8cbb4950548f9a000d808ea5bcc5232fa5ad8ff5d2713566ae982bd226fd0b7c3d01041df553666d120cccebfbc2b86472471c058c9caa74e5da1b39850bd51bf87fb4511425246751000e1347ca7a1eea5d680f3dc36cd76aaa07a52611575b0f1645acc31a8d3c66328c7d8a779bd0e1f89962dcb44efc056e2dbf18b56b96ffdefa0af4fe89b7fdf12e001017c333d537897ce6e9b2bc3abd4d43de2ecbcfd728674c189c0167f24089ec6f3a5e801b3d125c1ccf17216bb9eb2cc21e316ef5aafa6b3aa4edbf255514cf880111349096ddb94764342586c7204721639d92eeba073517f3a4968e3880b3c0675503661b9769f9d42a76dbee5764231514dad76113cfb895cfe125a351a863917b0061648e75000061b30001ec7372995d5cc8732397fb0ad35c0121e0eaa90d26f828a534cab54391b3a4f5000000000000086d20010000000000000000000000000000000000000000000000000000000000989680ce010e60afedb22717bd63192f54145a3f965a33bb82d2c7029eb2ce1e2082640001000000000000000000000000ce96a707a4e0b0fe34d28d3c4e580c48634519e500020000000000000000000000000000000000000000000000000000000000000000")
      // this.doWormholeRedeem("01000000010d004248b4d438b89f8bc60755cf7b608c2cf2ddef730cba0f46a2941ef73edf83982e86a6e5221de0c8dd86f96d84666fce0731aae4435ad8a9e86a2fe0c1ee63230001190a0f04fe1a84c15c4bdfac3547631b6391ad548e44cf4356e8e3cd1b8b740d1da1e651204bf48fb33c83bf5132c1b83862f06bff98f3eb50d22cce25bcefb60102ff03bdde2392cf45b21a182105c5a56d68aefbc128b82c80307b2b4e49497f38339bfb0471fc900414d5e408ecb3413388fe5771cdfc33f7fb7b83d07dbcff3500031117bb727bdde20705ef04b0bb4bec34111c595dd04eb92d562ff5b8466ee28878f9551e8b8e9e103c1d595812371ede7f716815558b667cb8f0b7eaec980ad10005bf60984a452d6cb989910e5fc47b8eff6621ca3736453344dedbbe7bf3023b475640c2eaba1f117a94312419c076763019f4afe6ece1e2ec6b176297092db42301083078f28b3579573cd24a3393d4b5db220c795aa3c1366d32704e080471de0fab47b1e2ed68bffb7cd5552a477ad54f58d442269301273c716d14d4a68e4ee6a8000cbc018b86503142eeafbf47d76f94cd5163660301c76dc303344b5c4c18da01e14fa4e39b7bbaee934007817cde405a2e7a155b837f76aeeb7808e5c7a3d9ac18000d237e5c0beb5346e142a962a0d917c6e5df131ef9728410caa3987f31f220e7546cd9d41ffe2b44b52e73cb10948efce6497b966a9bfc25f5a273b7d16a8dc318010e9156b5dd6ec50c077bf29e34ba7ba3ad9a10e7aaabfdecc743d8f762434745467fda25b6870eb267d01473f388764fd6bc3eb75a4fc3733b4ba4150671bd2821010faae13130f73c17e203b95415d8353acd22917a64a0ea9f9c808446996da5ef2753d9c12dc80c87a1c385de3d2b50cf1c821b7ec4da115c1471e6a497b7753af90010c56bc4a64e702c86cfe1e73b87c182894077a26dd94aa3022b53b5a4e5b596526b5086a8f7562f48a2da7ca800c71097fd2a80fc23757d2d65351c5cdd30baf601112565b609f99deff6412e87d97323427fee963dd9a5f3d4c263b9bb7ce8802ef17c1ff5063576d302ee9c5b3322956c8675615ca9c663c494f7472b1187284e3e0012f8a9d6131adce2d63e2af41049d0b11e7ed9eb87df1c962f2e047c61aee183643f85966056836d47be2e2d90de0264ca6c3f211f071efbe47cc789c2a3338aca0161647f490000cec30001ec7372995d5cc8732397fb0ad35c0121e0eaa90d26f828a534cab54391b3a4f5000000000000085b20010000000000000000000000000000000000000000000000000000000000989680ce010e60afedb22717bd63192f54145a3f965a33bb82d2c7029eb2ce1e2082640001000000000000000000000000ce96a707a4e0b0fe34d28d3c4e580c48634519e500020000000000000000000000000000000000000000000000000000000000000000")
      this.doWormholeTransfer(this.fromCoinAmount); if(this.progressText === "1")
      if (this.isWrap) {
        wrap(
          this.$axios,
          this.$web3,
          // @ts-ignore
          this.$wallet,
          // @ts-ignore
          this.fromCoin.mintAddress,
          // @ts-ignore
          this.midCoinStable.mintAddress,
          // @ts-ignore
          get(this.wallet.tokenAccounts, `${this.fromCoin.mintAddress}.tokenAccountAddress`),
          // @ts-ignore
          get(this.wallet.tokenAccounts, `${this.midCoinStable.mintAddress}.tokenAccountAddress`),
          this.fromCoinAmount
        )
          .then((txid) => {
            this.$notify.info({
              key,
              message: 'Transaction has been sent',
              description: (h: any) =>
                h('div', [
                  'Confirmation is in progress.  Check your transaction on ',
                  h('a', { attrs: { href: `${this.url.explorer}/tx/${txid}`, target: '_blank' } }, 'here')
                ])
            })

            const description = `Unwrap ${this.fromCoinAmount} ${this.fromCoin?.symbol} to ${this.best_midCoinStableAmount} ${this.midCoinStable?.symbol}`
            this.$accessor.transaction.sub({ txid, description })
          })
          .catch((error) => {
            this.$notify.error({
              key,
              message: 'Swap failed',
              description: error.message
            })
            console.log(error)
            this.swaping = false

          })
      } 
      else if (this.best_endpoint === 'Raydium Pool' && this.ammId) {

        const poolInfo = Object.values(this.$accessor.liquidity.infos).find((p: any) => p.ammId === this.ammId)
        raydiumSwap(
          this.$web3,
          // @ts-ignore
          this.$wallet,
          poolInfo,
          // @ts-ignore
          this.fromCoin.mintAddress,
          // @ts-ignore
          this.midCoinStable.mintAddress,
          // @ts-ignore
          get(this.wallet.tokenAccounts, `${this.fromCoin.mintAddress}.tokenAccountAddress`),
          // @ts-ignore
          get(this.wallet.tokenAccounts, `${this.midCoinStable.mintAddress}.tokenAccountAddress`),
          this.fromCoinAmount,
          this.best_midCoinStableWithSlippage
        )
        .then((result) => {
          const txid = result.tx
          this.$notify.info({
            key,
            message: 'Transaction has been sent',
            description: (h: any) =>
              h('div', [
                'Confirmation is in progress.  Check your transaction on ',
                h('a', { attrs: { href: `${this.url.explorer}/tx/${txid}`, target: '_blank' } }, 'here')
              ])
          })

          const description = `Swap ${this.fromCoinAmount} ${this.fromCoin?.symbol} to ${this.best_midCoinStableAmount} ${this.midCoinStable?.symbol}`
          this.$accessor.transaction.sub({ txid, description })

          this.doStableSwap(result.amountIncreased)
        })
        .catch((error) => {
          this.$notify.error({
            key,
            message: 'Swap failed',
            description: error.message
          })
          this.swaping = false
        })
      } else if(this.best_endpoint === 'Serum Dex') {
        serumPlace(
          this.$web3,
          // @ts-ignore
          this.$wallet,
          this.market,
          this.asks,
          this.bids,
          // @ts-ignore
          this.fromCoin.mintAddress,
          // @ts-ignore
          this.midCoinStable.mintAddress,
          // @ts-ignore
          get(this.wallet.tokenAccounts, `${this.fromCoin.mintAddress}.tokenAccountAddress`),
          // @ts-ignore
          get(this.wallet.tokenAccounts, `${this.midCoinStable.mintAddress}.tokenAccountAddress`),
          this.fromCoinAmount,
          this.setting.slippage
        )
        .then((result) => {
          const txid = result.tx
          this.$notify.info({
            key,
            message: 'Transaction has been sent',
            description: (h: any) =>
              h('div', [
                'Confirmation is in progress.  Check your transaction on ',
                h('a', { attrs: { href: `${this.url.explorer}/tx/${txid}`, target: '_blank' } }, 'here')
              ])
          })
          const description = `Swap ${this.fromCoinAmount} ${this.fromCoin?.symbol} to ${this.best_midCoinStableAmount} ${this.midCoinStable?.symbol}`
          this.$accessor.transaction.sub({ txid, description })
          
          this.doStableSwap(result.amountIncreased)

        })
        .catch((error) => {
          this.$notify.error({
            key,
            message: 'Swap failed',
            description: error.message
          })
          this.swaping = false
        })

      }
    },

    async updateUrl() {
      if (this.$route.path !== '/swap/') {
        return
      }
      const { from, to } = this.$route.query
      if (this.ammId) {
        await this.$router.push({
          path: '/swap/',
          query: {
            ammId: this.ammId
          }
        })
      } else if (this.fromCoin && this.midCoinStable) {
        if (this.fromCoin.mintAddress !== from || this.midCoinStable.mintAddress !== to) {
          await this.$router.push({
            path: '/swap/',
            query: {
              from: this.fromCoin.mintAddress,
              to: this.midCoinStable.mintAddress
            }
          })
        }
      } else if (!(this.$route.query && Object.keys(this.$route.query).length === 0)) {
        await this.$router.push({
          path: '/swap/'
        })
      }
    },

    closeAllModal(showName: string) {
      if (showName !== 'coinSelectShow') {
        this.coinSelectShow = false
      }
      if (showName !== 'ammIdSelectShow') {
        this.ammIdSelectShow = false
      }
      if (showName !== 'userCheckUnofficialShow') {
        this.userCheckUnofficialShow = false
      }
      if (showName !== 'ammIdOrMarketSearchShow') {
        this.ammIdOrMarketSearchShow = false
      }
    },

    async fetchUnsettledByMarket() {
      if (this.isFetchingUnsettled) return
      if (!this.$web3 || !this.$wallet || !this.market) return
      this.isFetchingUnsettled = true
      try {
        const info = await checkUnsettledInfo(this.$web3, this.$wallet, this.market)
        if (!info) throw new Error('not enough data')
        this.baseSymbol = info.baseSymbol ?? ''
        this.baseUnsettledAmount = info.baseUnsettledAmount

        this.quoteSymbol = info.quoteSymbol ?? ''
        this.quoteUnsettledAmount = info.quoteUnsettledAmount
        this.unsettledOpenOrders = info.openOrders // have to establish an extra state, to store this value
      } catch (e) {
      } finally {
        this.isFetchingUnsettled = false
      }
    },

    settleFunds(from: 'base' | 'quote') {
      const key = getUnixTs().toString()
      this.$notify.info({
        key,
        message: 'Making transaction...',
        description: '',
        duration: 0
      })

      let baseMint = (this.market as Market).baseMintAddress.toBase58()
      let quoteMint = (this.market as Market).quoteMintAddress.toBase58()

      let baseWallet = get(this.wallet.tokenAccounts, `${baseMint}.tokenAccountAddress`)
      let quoteWallet = get(this.wallet.tokenAccounts, `${quoteMint}.tokenAccountAddress`)
      if (from === 'quote') {
        [baseWallet, quoteWallet] = [quoteWallet, baseWallet]
        ;[baseMint, quoteMint] = [quoteMint, baseMint]
      }
      if (from === 'quote') {
        this.isSettlingQuote = true
      } else {
        this.isSettlingBase = true
      }

      settleFund(
        this.$web3,
        this.market,
        this.unsettledOpenOrders,
        this.$wallet,
        baseMint,
        quoteMint,
        baseWallet,
        quoteWallet
      )
        .then((txid) => {
          this.$notify.info({
            key,
            message: 'Transaction has been sent',
            description: (h: any) =>
              h('div', [
                'Confirmation is in progress.  Check your transaction on ',
                h('a', { attrs: { href: `${this.url.explorer}/tx/${txid}`, target: '_blank' } }, 'here')
              ])
          })

          const description = `Settle`
          this.$accessor.transaction.sub({ txid, description })
        })
        .then(() => {
          this.fetchUnsettledByMarket()
        })
        .catch((error) => {
          this.$notify.error({
            key,
            message: 'Settle failed',
            description: error.message
          })
          this.isSettlingQuote = false
          this.isSettlingBase = false
        })
    }
  }
})
</script>

<style>
.swap-confirm-modal .ant-btn-text {
  background: transparent;
  border: none;
}
.swap-confirm-modal .title {
  font-size: 22px;
  font-weight: 500;
  text-align: center;
  margin-bottom: 8px;
}
.swap-confirm-modal .description {
  text-align: center;
  margin: 0 64px 32px;
}
.swap-confirm-modal .description-secondary {
  font-size: 16px;
  text-align: center;
  margin: 0 32px 16px;
}
.swap-confirm-modal .description .highlight {
  font-weight: bold;
  color: #ed4b9e;
}
.swap-confirm-modal .btn-group {
  display: grid;
  justify-items: center;
  gap: 4px;
}
.swap-confirm-modal .btn-group .cancel-btn {
  width: 156px;
}
</style>

<style lang="less" sxcoped>
.warning-style {
  font-weight: bold;
  color: #f0b90b;
}
.swap-btn.warning-style {
  font-weight: normal;
}
.error-style {
  font-weight: bold;
  color: #ed4b9e;
}
.swap-btn.error-style {
  font-weight: normal;
}

.container {
  max-width: 450px;

  .price-info {
    display: grid;
    grid-auto-rows: auto;
    grid-row-gap: 8px;
    row-gap: 8px;
    padding: 0 12px;
    font-size: 12px;
    line-height: 20px;
    margin-bottom: 6px;
    .anticon-swap {
      margin-left: 10px;
      padding: 5px;
      border-radius: 50%;
      background: #000829;
    }
    .price-base {
      line-height: 24px;
    }
    .fs-container {
      .name {
        opacity: 0.75;
      }
    }
  }

  .not-enough-sol-alert {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-bottom: -18px;
    margin-top: 4px;
  }

  .change-side {
    div {
      height: 32px;
      width: 32px;
      border-radius: 50%;
      background: #000829;
      cursor: pointer;
    }
  }

  .fetching-unsettled {
    margin: 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    color: #ffffffad;
    span {
      margin-top: 16px;
      text-align: center;
    }
  }

  .settle.card-body {
    padding: 16px 24px;
  }
  .extra {
    margin-top: 32px;
    margin-bottom: 32px;

    .settel-panel {
      .align-right {
        text-align: right;
      }
      th {
        font-weight: normal;
      }
      td {
        padding-bottom: 4px;
        width: 25%;
      }
      thead {
        font-size: 14px;
        tr:first-child {
          margin-top: 8px;
        }
      }
      tbody {
        tr:first-child {
          td {
            padding-top: 6px;
          }
        }
      }
    }
  }
}
</style>
