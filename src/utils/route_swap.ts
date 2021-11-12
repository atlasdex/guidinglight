// @ts-ignore
import { nu64, struct, u8 } from 'buffer-layout';


// import { _OPEN_ORDERS_LAYOUT_V2, Market, OpenOrders } from '@project-serum/serum/lib/market';
import { closeAccount } from '@project-serum/serum/lib/token-instructions';
import {
  Account, Connection, 
  // LAMPORTS_PER_SOL, 
  PublicKey, Transaction, TransactionInstruction
} from '@solana/web3.js';

// eslint-disable-next-line
import { RAY_LP_PROGRAM_ID_V4, MEMO_PROGRAM_ID, SERUM_PROGRAM_ID_V3, SYSTEM_PROGRAM_ID, TOKEN_PROGRAM_ID, STABLE_LP_PROGRAM_ID, FEE_OWNER, ROUTER_PROGRAM_ID } from '@/utils/ids';
import { getBigNumber } from '@/utils/layouts';
// eslint-disable-next-line
import { getTokenBalance, getTokenByMintAddress, NATIVE_SOL, TOKENS } from '@/utils/tokens';
import { TokenAmount } from '@/utils/safe-math';
import {
  createAssociatedTokenAccountIfNotExist, 
  // createProgramAccountIfNotExist,
  createTokenAccountIfNotExist, 
  // mergeTransactions, 
  sendTransaction,
  getOneFilteredTokenAccountsByOwner
} from '@/utils/web3';

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


export async function routeSwap(
  connection: Connection,
  wallet: any,

  rayPoolInfo: any,
  stablePoolInfo:any,
  
  fromCoinMint: string,
  midCoinMint: string,
  toCoinMint: string,
  
  fromTokenAccount: string,
  midTokenAccount: string,
  toTokenAccount: string,
  aIn: string,
  route1:string,
  route2:string,
) {
  const transaction = new Transaction()
  const signers: Account[] = []

  const owner = wallet.publicKey

  const from = getTokenByMintAddress(fromCoinMint)
  const to = getTokenByMintAddress(toCoinMint)
  if (!from || !to) {
    throw new Error('Miss token info')
  }

  const amountIn = new TokenAmount(aIn, from.decimals, false)
  let fromMint = fromCoinMint
  let toMint = toCoinMint
  let midMint = midCoinMint

  if (fromMint === NATIVE_SOL.mintAddress) {
    fromMint = TOKENS.WSOL.mintAddress
  }
  if (midMint === NATIVE_SOL.mintAddress) {
    midMint = TOKENS.WSOL.mintAddress
  }

  if (toMint === NATIVE_SOL.mintAddress) {
    toMint = TOKENS.WSOL.mintAddress
  }

  let wrappedSolAccount: PublicKey | null = null
  let wrappedSolAccount2: PublicKey | null = null
  let wrappedSolAccount3: PublicKey | null = null

  if (fromCoinMint === NATIVE_SOL.mintAddress) {
    wrappedSolAccount = await createTokenAccountIfNotExist(
      connection,
      null,
      owner,
      TOKENS.WSOL.mintAddress,
      getBigNumber(amountIn.wei) + 1e7,
      transaction,
      signers
    )
  }
  if (midCoinMint === NATIVE_SOL.mintAddress) {
    wrappedSolAccount2 = await createTokenAccountIfNotExist(
      connection,
      null,
      owner,
      TOKENS.WSOL.mintAddress,
      1e7,
      transaction,
      signers
    )
  }

  if (toCoinMint === NATIVE_SOL.mintAddress) {
    wrappedSolAccount3 = await createTokenAccountIfNotExist(
      connection,
      null,
      owner,
      TOKENS.WSOL.mintAddress,
      1e7,
      transaction,
      signers
    )
  }

  const newFromTokenAccount = await createAssociatedTokenAccountIfNotExist(fromTokenAccount,owner,fromMint,transaction)
  const newMidTokenAccount = await createAssociatedTokenAccountIfNotExist(midTokenAccount, owner, midMint, transaction)
  const newToTokenAccount = await createAssociatedTokenAccountIfNotExist(toTokenAccount, owner, toMint, transaction)
  const feeTokenAccount = (fromCoinMint === NATIVE_SOL.mintAddress) ?   FEE_OWNER :
        await getOneFilteredTokenAccountsByOwner(connection, new PublicKey(FEE_OWNER), new PublicKey(fromCoinMint))
  transaction.add(
    routeSwapInstruction(
      rayPoolInfo,
      stablePoolInfo,

      POOL_INDEX[route1],
      POOL_INDEX[route2],

      wrappedSolAccount ?? newFromTokenAccount,
      wrappedSolAccount2 ?? newMidTokenAccount,
      wrappedSolAccount3 ?? newToTokenAccount,

      owner,
      FEE_OWNER,
      new PublicKey(feeTokenAccount),

      Math.floor(getBigNumber(amountIn.toWei())),
    )
  )

  if (wrappedSolAccount) {
    transaction.add(
      closeAccount({
        source: wrappedSolAccount,
        destination: owner,
        owner
      })
    )
  }
  if (wrappedSolAccount2) {
    transaction.add(
      closeAccount({
        source: wrappedSolAccount2,
        destination: owner,
        owner
      })
    )
  }
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
function getSerumAccountInfos(_poolInfo:any)
{
  return [
  ]
}

function getSaberAccountInfos(_poolInfo:any)
{
  return [
  ]
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

function getOrcaAccountInfos(_poolInfo:any)
{
  return [
  ]
}

const getSwapKeys = [
  getRaydiumAccountInfos,
  getSerumAccountInfos,
  getSaberAccountInfos,
  getMercurialAccountInfos,
  getAtlasAccountInfos,
  getOrcaAccountInfos,

]

export function routeSwapInstruction(
  pool1:any,
  pool2:any,
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

    ...(getSwapKeys[route1])(pool1),
    ...(getSwapKeys[route2])(pool2),

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
