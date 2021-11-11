import { getterTree, mutationTree, actionTree } from 'typed-vuex'
import detectEthereumProvider from "@metamask/detect-provider";
import { BigNumber, ethers } from "ethers";

export type Provider = ethers.providers.Web3Provider | undefined;
export type Signer = ethers.Signer | undefined;

export const state = () => ({
  connected: false,
  message: "",
  web3: null,
  balance: '0 ETH',
  address: '',
  provider: null,
  signer: null,
  chainId: 0,
})

export const getters = getterTree(state, {})

export const mutations = mutationTree(state, {
  setConnected(state, newState) {
    state.connected = newState.connected
    state.message =  newState.msg
  },
  setProvider(state, provider) {
    state.provider = provider
  },
  setSigner(state, signer) {
    state.signer = signer
  },
  setSignerAddress(state, address) {
    state.address = address
    if(state.provider)
    {
      (state.provider as any).getBalance(address).then((balance:any)=>{
        const balanceInEth = ethers.utils.formatEther(balance).slice(0,6)
        state.balance = `${balanceInEth} ETH`;
      })
    }
  },
  setChainId(state, chainId) {
    state.chainId = chainId
  },
  setBalance(state, balance){
    state.balance = balance
  }
})

export const actions = actionTree(
  { state, getters, mutations },
  {
    connectMetamask({ commit }) {
      detectEthereumProvider()
      .then((detectedProvider:any) => {
        if (detectedProvider) {
          const provider = new ethers.providers.Web3Provider(
            // @ts-ignore
            detectedProvider,
            "any"
          );
          provider
            .send("eth_requestAccounts", [])
            .then(() => {
              commit("setConnected", {connected: true, msg: ""})
              commit("setProvider", provider)
              provider
                .getNetwork()
                .then((network) => {
                  commit("setChainId", network.chainId)
                })
                .catch(() => {
                  commit("setConnected", {connected:false, msg: "An error occurred while getting the network"})
                });

              const signer = provider.getSigner();
              commit("setSigner", signer)
              signer
                .getAddress()
                .then((address) => {
                  commit("setSignerAddress", address)
                })
                .catch(() => {
                  commit("setConnected", {connected:false, msg: "An error occurred while getting the signer address"})
                });
              
              // TODO: try using ethers directly
              // @ts-ignore
              if (detectedProvider && detectedProvider.on) {
                // @ts-ignore
                detectedProvider.on("chainChanged", (chainId) => {
                  try {
                    commit("setChainId", BigNumber.from(chainId).toNumber() )
                  } catch (e) {}
                });
                // @ts-ignore
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                detectedProvider.on("accountsChanged", (accounts) => {
                  try {
                    const signer = provider.getSigner();
                    commit("setSigner", signer )
                    signer
                      .getAddress()
                      .then((address) => {
                        commit("setSignerAddress", address )

                      })
                      .catch(() => {
                        commit("setConnected", {connected:false, msg: "An error occurred while getting the signer address"})
                      });
                  } catch (e) {}
                });
              }
            })
            .catch(() => {
              commit("setConnected", {connected:false, msg: "An error occurred while requesting eth accounts"})
            });
        } else {
          commit("setConnected", {connected:false, msg: "Please install MetaMask"})
        }
      })
      .catch(() => {
        commit("setConnected", {connected:false, msg: "Please install MetaMask"})
      });
    },
  }
)
