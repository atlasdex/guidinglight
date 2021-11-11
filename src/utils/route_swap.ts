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
import { SYSTEM_PROGRAM_ID, TOKEN_PROGRAM_ID, FEE_OWNER, ROUTER_PROGRAM_ID } from '@/utils/ids';
import { getBigNumber } from '@/utils/layouts';
// eslint-disable-next-line
import { getTokenBalance, getTokenByMintAddress, NATIVE_SOL, TOKENS } from '@/utils/tokens';
import { TokenAmount } from '@/utils/safe-math';
import {
  createAssociatedTokenAccountIfNotExist, 
  createTokenAccountIfNotExist,  sendTransaction,
  getOneFilteredTokenAccountsByOwner
} from '@/utils/web3';

export async function route2Raydium(
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
    route2RayInstruction(
      new PublicKey(rayPoolInfo.programId),
      new PublicKey(rayPoolInfo.ammId),

      new PublicKey(rayPoolInfo.ammAuthority),
      new PublicKey(rayPoolInfo.ammOpenOrders),
      new PublicKey(rayPoolInfo.ammTargetOrders),
      new PublicKey(rayPoolInfo.poolCoinTokenAccount),
      new PublicKey(rayPoolInfo.poolPcTokenAccount),

      new PublicKey(rayPoolInfo.serumProgramId),
      new PublicKey(rayPoolInfo.serumMarket),
      new PublicKey(rayPoolInfo.serumBids),
      new PublicKey(rayPoolInfo.serumAsks),
      new PublicKey(rayPoolInfo.serumEventQueue),
      new PublicKey(rayPoolInfo.serumCoinVaultAccount),
      new PublicKey(rayPoolInfo.serumPcVaultAccount),
      new PublicKey(rayPoolInfo.serumVaultSigner),

      new PublicKey(stablePoolInfo.programId),
      new PublicKey(stablePoolInfo.ammId),
      new PublicKey(stablePoolInfo.ammAuthority),
      new PublicKey(stablePoolInfo.poolCoinTokenAccount),
      new PublicKey(stablePoolInfo.poolPcTokenAccount),
      new PublicKey(stablePoolInfo.lp.mintAddress),
      new PublicKey(stablePoolInfo.feeAccount),

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

export function route2RayInstruction(
  // amm
  rayProgramId: PublicKey,
  ammId: PublicKey,
  ammAuthority: PublicKey,
  ammOpenOrders: PublicKey,
  ammTargetOrders: PublicKey,
  poolCoinTokenAccount: PublicKey,
  poolPcTokenAccount: PublicKey,
  // serum
  serumProgramId: PublicKey,
  serumMarket: PublicKey,
  serumBids: PublicKey,
  serumAsks: PublicKey,
  serumEventQueue: PublicKey,
  serumCoinVaultAccount: PublicKey,
  serumPcVaultAccount: PublicKey,
  serumVaultSigner: PublicKey,
  
  // stable pool
  stableProgramId: PublicKey,
  stableAMMId: PublicKey,
  stableAuthority: PublicKey,
  stableCoinToken: PublicKey,
  stablePcToken: PublicKey,
  stableLPMint: PublicKey,
  stableFeeAccount: PublicKey,


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
  const dataLayout = struct([u8('instruction'), nu64('amountIn')])

  const keys = [
    { pubkey: ammId, isSigner: false, isWritable: true },
    { pubkey: ammAuthority, isSigner: false, isWritable: false },
    { pubkey: ammOpenOrders, isSigner: false, isWritable: true },
    { pubkey: ammTargetOrders, isSigner: false, isWritable: true },
    { pubkey: poolCoinTokenAccount, isSigner: false, isWritable: true },
    { pubkey: poolPcTokenAccount, isSigner: false, isWritable: true },
    // serum
    { pubkey: serumProgramId, isSigner: false, isWritable: false },
    { pubkey: serumMarket, isSigner: false, isWritable: true },
    { pubkey: serumBids, isSigner: false, isWritable: true },
    { pubkey: serumAsks, isSigner: false, isWritable: true },
    { pubkey: serumEventQueue, isSigner: false, isWritable: true },
    { pubkey: serumCoinVaultAccount, isSigner: false, isWritable: true },
    { pubkey: serumPcVaultAccount, isSigner: false, isWritable: true },
    { pubkey: serumVaultSigner, isSigner: false, isWritable: false },

    { pubkey: stableAMMId, isSigner: false, isWritable: true },
    { pubkey: stableAuthority, isSigner: false, isWritable: false },
    { pubkey: stableCoinToken, isSigner: false, isWritable: true },
    { pubkey: stablePcToken, isSigner: false, isWritable: true },
    { pubkey: stableLPMint, isSigner: false, isWritable: true },
    { pubkey: stableFeeAccount, isSigner: false, isWritable: true },

    { pubkey: userOwner, isSigner: true, isWritable: false },
    { pubkey: userSourceTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userStableTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userDestTokenAccount, isSigner: false, isWritable: true },
    { pubkey: feeTokenAccount, isSigner: false, isWritable: true },
    { pubkey: feeOwner, isSigner: false, isWritable: true },

    { pubkey: rayProgramId, isSigner: false, isWritable: false },
    { pubkey: stableProgramId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
  ]

  const data = Buffer.alloc(dataLayout.span)
  dataLayout.encode(
    {
      instruction: 0,
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
