// @ts-ignore
import { nu64, struct, u8 } from 'buffer-layout';


// import { _OPEN_ORDERS_LAYOUT_V2, Market, OpenOrders } from '@project-serum/serum/lib/market';
// import { closeAccount } from '@project-serum/serum/lib/token-instructions';
import {
  Account, Connection, 
  // LAMPORTS_PER_SOL, 
  PublicKey, Transaction, TransactionInstruction
} from '@solana/web3.js';

import { swapInstruction as raydiumSwapInstruction, transfer} from './swap';
import { atlasSwapInstruction, mercurialSwapInstruction} from './stable_swap';
import { getBigNumber } from './layouts';
// eslint-disable-next-line
import { RAY_LP_PROGRAM_ID_V4, MEMO_PROGRAM_ID, SERUM_PROGRAM_ID_V3, SYSTEM_PROGRAM_ID, TOKEN_PROGRAM_ID, STABLE_LP_PROGRAM_ID, FEE_OWNER, ROUTER_PROGRAM_ID } from './ids';
// eslint-disable-next-line
import { getTokenBalance, 
  getTokenByMintAddress, 
  NATIVE_SOL, TOKENS 
} from './tokens';
import { TokenAmount } from './safe-math';
import {
  createAssociatedTokenAccountIfNotExist, 
  // createProgramAccountIfNotExist,
  // createTokenAccountIfNotExist, 
  // mergeTransactions, 
  sendTransaction,
  getOneFilteredTokenAccountsByOwner,
  createAtaSolIfNotExistAndWrap,
  createAssociatedTokenAccountIfNotExist2
} from './web3';

export const SPL_ENDPOINT_RAY = 'Raydium Pool'
export const SPL_ENDPOINT_SRM = 'Serum Dex'
export const SPL_ENDPOINT_SABER = 'Saber Pool'
export const SPL_ENDPOINT_MERCURIAL = 'Mercurial Pool'
export const SPL_ENDPOINT_ATLAS = 'Atlas Pool'
export const SPL_ENDPOINT_ORCA = 'Orca Pool'

const POOL_INDEX:any = {
  'Raydium Pool': 0,
  'Serum Dex': 1,
  'Saber Pool': 2,
  'Mercurial Pool': 3,
  'Atlas Pool': 4,
  'Orca Pool': 5,
}

export async function preSwapRoute(
  connection: Connection,
  wallet: any,
  fromMint: string,
  fromTokenAccount: string,
  feeAccount:string,
  middleMint: string,
  middleTokenAccount: string,
  toMint: string,
  toTokenAccount: string,
  needWrapAmount: number
) {
  const transaction = new Transaction()
  const signers: Account[] = []
  const owner = wallet.publicKey
  console.log('needWrapAmount:', needWrapAmount)
  if (fromMint === TOKENS.WSOL.mintAddress) {
    await createAtaSolIfNotExistAndWrap(connection, fromTokenAccount, owner, transaction, signers, needWrapAmount)
  }
  const feeTokenMint = fromMint

  await createAssociatedTokenAccountIfNotExist2(feeAccount, FEE_OWNER, owner,  feeTokenMint, transaction)

  await createAssociatedTokenAccountIfNotExist(middleTokenAccount, owner, middleMint, transaction)

  await createAssociatedTokenAccountIfNotExist(toTokenAccount, owner, toMint, transaction)

  return await sendTransaction(connection, wallet, transaction, signers)
}

export async function routeSwap(
  connection: Connection,
  wallet: any,

  poolInfo1: any,
  poolInfo2:any,
  
  fromCoinMint: string,
  midCoinMint: string,
  toCoinMint: string,
  
  fromTokenAccount: string,
  midTokenAccount: string,
  toTokenAccount: string,
  
  aIn: string,
  aOut:string,

  route1:string,
  route2:string,
) {
  const transaction = new Transaction()
  const signers: Account[] = []

  const owner = wallet.publicKey

  const from = getTokenByMintAddress(fromCoinMint)
  const mid = getTokenByMintAddress(midCoinMint)
  const to = getTokenByMintAddress(toCoinMint)
  if (!from || !to) {
    throw new Error('Miss token info')
  }

  const amountIn = new TokenAmount(aIn, from.decimals, false)
  const amountMid = new TokenAmount(aOut, mid?.decimals, false)

  let fromMint = fromCoinMint
  let toMint = toCoinMint
  let midMint = midCoinMint

  if (fromMint === NATIVE_SOL.mintAddress) fromMint = TOKENS.WSOL.mintAddress
  if (midMint === NATIVE_SOL.mintAddress) midMint = TOKENS.WSOL.mintAddress
  if (toMint === NATIVE_SOL.mintAddress) toMint = TOKENS.WSOL.mintAddress

  const newFromTokenAccount = new PublicKey(fromTokenAccount)
  const newMidTokenAccount = new PublicKey(midTokenAccount)
  const newToTokenAccount = new PublicKey(toTokenAccount)
  
  const inAmount = Math.floor(getBigNumber(amountIn.toWei()))
  const feeAmount = Math.max(Math.floor(inAmount * 5 / 1000), 0)
  const swapAmount = inAmount - feeAmount
  const midAmount = Math.floor(getBigNumber(amountMid.toWei()) * 995 / 1000)
  const feeTokenAccount = await getOneFilteredTokenAccountsByOwner(connection, new PublicKey(FEE_OWNER), new PublicKey(fromMint))
  console.log("Fee account", feeTokenAccount)

  // transaction.add(
  //   routeSwapInstruction(
  //     poolInfo1,
  //     poolInfo2,

  //     POOL_INDEX[route1],
  //     POOL_INDEX[route2],

  //     newFromTokenAccount,
  //     newMidTokenAccount,
  //     newToTokenAccount,

  //     owner,
  //     FEE_OWNER,
  //     new PublicKey(feeTokenAccount),

  //     Math.floor(getBigNumber(amountIn.toWei())),
  //   )
  // )

  if(feeTokenAccount)
  {
    transaction.add(
      transfer(newFromTokenAccount, new PublicKey(feeTokenAccount), owner, feeAmount)
    )
  }

  transaction.add(
    (map2SwapInstructions[POOL_INDEX[route1]])(
      poolInfo1, 
      newFromTokenAccount, 
      newMidTokenAccount, 
      owner, 
      swapAmount, 
      midAmount,  )
  )

  transaction.add(
    (map2SwapInstructions[POOL_INDEX[route2]])(
      poolInfo2, 
      newMidTokenAccount, 
      newToTokenAccount, 
      owner, 
      midAmount, 
      0 )
  )

  return await sendTransaction(connection, wallet, transaction, signers)
}

function getRaydiumAccountInfos(rayPoolInfo:any)
{
  return [
    { pubkey: rayPoolInfo.ammId, isSigner: false, isWritable: true },
    { pubkey: rayPoolInfo.ammAuthority, isSigner: false, isWritable: false },
    { pubkey: rayPoolInfo.ammOpenOrders, isSigner: false, isWritable: true },
    { pubkey: rayPoolInfo.ammTargetOrders, isSigner: false, isWritable: true },
    { pubkey: rayPoolInfo.poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: rayPoolInfo.poolPcTokenAccount, isSigner: false, isWritable: true },
    // serum
    { pubkey: rayPoolInfo.serumProgramId, isSigner: false, isWritable: false },
    { pubkey: rayPoolInfo.serumMarket, isSigner: false, isWritable: true },
    { pubkey: rayPoolInfo.serumBids, isSigner: false, isWritable: true },
    { pubkey: rayPoolInfo.serumAsks, isSigner: false, isWritable: true },
    { pubkey: rayPoolInfo.serumEventQueue, isSigner: false, isWritable: true },
    { pubkey: rayPoolInfo.serumCoinVaultAccount, isSigner: false, isWritable: true },
    { pubkey: rayPoolInfo.serumPcVaultAccount, isSigner: false, isWritable: true },
    { pubkey: rayPoolInfo.serumVaultSigner, isSigner: false, isWritable: false },

    { pubkey: rayPoolInfo.programId, isSigner: false, isWritable: false },

  ]
}

function getRaydiumInstructions(
  poolInfo:any, 
  sourceToken:any, 
  destToken:any, 
  userOwner:any,
  amountIn:number,
  amountOut:number
){
  return raydiumSwapInstruction(
          new PublicKey(poolInfo.programId),
          new PublicKey(poolInfo.ammId),
          new PublicKey(poolInfo.ammAuthority),
          new PublicKey(poolInfo.ammOpenOrders),
          new PublicKey(poolInfo.ammTargetOrders),
          new PublicKey(poolInfo.poolCoinTokenAccount),
          new PublicKey(poolInfo.poolPcTokenAccount),
          new PublicKey(poolInfo.serumProgramId),
          new PublicKey(poolInfo.serumMarket),
          new PublicKey(poolInfo.serumBids),
          new PublicKey(poolInfo.serumAsks),
          new PublicKey(poolInfo.serumEventQueue),
          new PublicKey(poolInfo.serumCoinVaultAccount),
          new PublicKey(poolInfo.serumPcVaultAccount),
          new PublicKey(poolInfo.serumVaultSigner),
          sourceToken,
          destToken,
          userOwner,
          amountIn,
          amountOut
        )
}

function getAtlasAccountInfos(poolInfo:any)
{
  return [
    { pubkey: poolInfo.ammId, isSigner: false, isWritable: true },
    { pubkey: poolInfo.ammAuthority, isSigner: false, isWritable: false },
    { pubkey: poolInfo.poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolInfo.poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolInfo.lp.mintAddress, isSigner: false, isWritable: true },
    { pubkey: poolInfo.feeAccount, isSigner: false, isWritable: true },

    { pubkey: poolInfo.programId, isSigner: false, isWritable: false },
  ]
}

function getAtlasInstructions(
  poolInfo:any, 
  sourceToken:any, 
  destToken:any, 
  userOwner:any,
  amountIn:number,
  amountOut:number
){
  return  atlasSwapInstruction(
    new PublicKey(poolInfo.ammId),
    new PublicKey(poolInfo.ammAuthority),
    userOwner,
    sourceToken,
    new PublicKey(poolInfo.poolCoinTokenAccount),
    new PublicKey(poolInfo.poolPcTokenAccount),
    destToken,
    new PublicKey(poolInfo.lp.mintAddress),
    new PublicKey(poolInfo.feeAccount),
    new PublicKey(poolInfo.programId),
    TOKEN_PROGRAM_ID,
    amountIn,
    amountOut,
    undefined
)
}


function getSerumAccountInfos(_poolInfo:any)
{
  return [
  ]
}

function getSerumInstructions(
  poolInfo:any, 
  sourceToken:any, 
  destToken:any, 
  userOwner:any,
  amountIn:number,
  amountOut:number
){
  return raydiumSwapInstruction(
          new PublicKey(poolInfo.programId),
          new PublicKey(poolInfo.ammId),
          new PublicKey(poolInfo.ammAuthority),
          new PublicKey(poolInfo.ammOpenOrders),
          new PublicKey(poolInfo.ammTargetOrders),
          new PublicKey(poolInfo.poolCoinTokenAccount),
          new PublicKey(poolInfo.poolPcTokenAccount),
          new PublicKey(poolInfo.serumProgramId),
          new PublicKey(poolInfo.serumMarket),
          new PublicKey(poolInfo.serumBids),
          new PublicKey(poolInfo.serumAsks),
          new PublicKey(poolInfo.serumEventQueue),
          new PublicKey(poolInfo.serumCoinVaultAccount),
          new PublicKey(poolInfo.serumPcVaultAccount),
          new PublicKey(poolInfo.serumVaultSigner),
          sourceToken,
          destToken,
          userOwner,
          amountIn,
          amountOut,
        )
}


function getSaberAccountInfos(poolInfo:any)
{
  return [
    { pubkey: poolInfo.ammId, isSigner: false, isWritable: true },
    { pubkey: poolInfo.ammAuthority, isSigner: false, isWritable: false },
    { pubkey: poolInfo.poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolInfo.poolPcTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolInfo.lp.mintAddress, isSigner: false, isWritable: true },
    { pubkey: poolInfo.feeAccount, isSigner: false, isWritable: true },

    { pubkey: poolInfo.programId, isSigner: false, isWritable: false },
  ]
}

function getSaberInstructions(
  poolInfo:any, 
  sourceToken:any, 
  destToken:any, 
  userOwner:any,
  amountIn:number,
  amountOut:number
){
  return raydiumSwapInstruction(
          new PublicKey(poolInfo.programId),
          new PublicKey(poolInfo.ammId),
          new PublicKey(poolInfo.ammAuthority),
          new PublicKey(poolInfo.ammOpenOrders),
          new PublicKey(poolInfo.ammTargetOrders),
          new PublicKey(poolInfo.poolCoinTokenAccount),
          new PublicKey(poolInfo.poolPcTokenAccount),
          new PublicKey(poolInfo.serumProgramId),
          new PublicKey(poolInfo.serumMarket),
          new PublicKey(poolInfo.serumBids),
          new PublicKey(poolInfo.serumAsks),
          new PublicKey(poolInfo.serumEventQueue),
          new PublicKey(poolInfo.serumCoinVaultAccount),
          new PublicKey(poolInfo.serumPcVaultAccount),
          new PublicKey(poolInfo.serumVaultSigner),
          sourceToken,
          destToken,
          userOwner,
          amountIn,
          amountOut,
        )
}



function getMercurialAccountInfos(poolInfo:any)
{
  return [
    { pubkey: poolInfo.ammId, isSigner: false, isWritable: true },
    { pubkey: poolInfo.ammAuthority, isSigner: false, isWritable: false },

    ...poolInfo.accounts.map((tokenAccount:string) => ({ pubkey: tokenAccount, isSigner: false, isWritable: true })),
    
    { pubkey: poolInfo.programId, isSigner: false, isWritable: false },
  ]
}

function getMercurialInstructions(
  poolInfo:any, 
  sourceToken:any, 
  destToken:any, 
  userOwner:any,
  amountIn:number,
  amountOut:number
){
  return mercurialSwapInstruction(
          new PublicKey(poolInfo.ammId),
          new PublicKey(poolInfo.ammAuthority),
          userOwner,
          poolInfo.accounts,
          sourceToken,
          destToken,
          amountIn,
          amountOut,
          new PublicKey(poolInfo.programId),
        )
}



function getOrcaAccountInfos(_poolInfo:any)
{
  return [
  ]
}
function getOrcaInstructions(
  poolInfo:any, 
  sourceToken:any, 
  destToken:any, 
  userOwner:any,
  amountIn:number,
  amountOut:number
){
  return raydiumSwapInstruction(
          new PublicKey(poolInfo.programId),
          new PublicKey(poolInfo.ammId),
          new PublicKey(poolInfo.ammAuthority),
          new PublicKey(poolInfo.ammOpenOrders),
          new PublicKey(poolInfo.ammTargetOrders),
          new PublicKey(poolInfo.poolCoinTokenAccount),
          new PublicKey(poolInfo.poolPcTokenAccount),
          new PublicKey(poolInfo.serumProgramId),
          new PublicKey(poolInfo.serumMarket),
          new PublicKey(poolInfo.serumBids),
          new PublicKey(poolInfo.serumAsks),
          new PublicKey(poolInfo.serumEventQueue),
          new PublicKey(poolInfo.serumCoinVaultAccount),
          new PublicKey(poolInfo.serumPcVaultAccount),
          new PublicKey(poolInfo.serumVaultSigner),
          sourceToken,
          destToken,
          userOwner,
          amountIn,
          amountOut,
        )
}


const map2DexAccountKeys = [
  getRaydiumAccountInfos,
  getSerumAccountInfos,
  getSaberAccountInfos,
  getMercurialAccountInfos,
  getAtlasAccountInfos,
  getOrcaAccountInfos,
]

const map2SwapInstructions = [
  getRaydiumInstructions,
  getSerumInstructions,
  getSaberInstructions,
  getMercurialInstructions,
  getAtlasInstructions,
  getOrcaInstructions,

]

export function routeSwapInstruction(
  pool1:any,
  _pool2:any,
  route1:number,
  route2:number,
  
  // user
  userSourceTokenAccount: PublicKey,
  userStableTokenAccount: PublicKey,
  userDestTokenAccount: PublicKey,
  userOwner: PublicKey,

  // fee
  feeOwner: PublicKey,
  feeTokenAccount:PublicKey,
  
  amountIn: number,

): TransactionInstruction {
  const dataLayout = struct([u8('instruction'), u8('route1'), u8('route2'), nu64('amountIn')])
    
  const keys = [

    { pubkey: userOwner, isSigner: true, isWritable: false },
    { pubkey: userSourceTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userStableTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userDestTokenAccount, isSigner: false, isWritable: true },
    { pubkey: feeTokenAccount, isSigner: false, isWritable: true },
    { pubkey: feeOwner, isSigner: false, isWritable: true },

    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },

    ...(map2DexAccountKeys[route1])(pool1),
    // ...(map2DexAccountKeys[route2])(pool2),

  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      instruction: 0,
      route1,
      route2,
      amountIn,
    },
    data
  )

  return new TransactionInstruction({
    keys,
    programId: new PublicKey(ROUTER_PROGRAM_ID),
    data
  })
}
