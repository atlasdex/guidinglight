import { closeAccount } from "@project-serum/serum/lib/token-instructions";
import { Account, Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
// @ts-ignore
import { nu64} from 'buffer-layout'
import { struct,  u8} from '@project-serum/borsh'

import { getBigNumber } from "@/utils/layouts";
import { TokenAmount } from "@/utils/safe-math";
import { 
  // getTokenBalance,
  NATIVE_SOL, TOKENS, getTokenByMintAddress, TokenInfo, Tokens } from "@/utils/tokens";
import { createAssociatedTokenAccountIfNotExist, createTokenAccountIfNotExist, sendTransaction } from "@/utils/web3";


export const atlasSwapInstruction = (
  tokenSwap: PublicKey,
  authority: PublicKey,
  userTransferAuthority: PublicKey,
  userSource: PublicKey,
  poolSource: PublicKey,
  poolDestination: PublicKey,
  userDestination: PublicKey,
  poolMint: PublicKey,
  feeAccount: PublicKey,
  swapProgramId: PublicKey,
  tokenProgramId: PublicKey,
  amountIn: number,
  minimumAmountOut: number,
  programOwner?: PublicKey
): TransactionInstruction => {

  const dataLayout = struct([
    u8("instruction"),
    nu64("amountIn"),
    nu64("minimumAmountOut"),
  ]);

  const keys = [
    { pubkey: tokenSwap, isSigner: false, isWritable: false },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: userTransferAuthority, isSigner: true, isWritable: false },
    { pubkey: userSource, isSigner: false, isWritable: true },
    { pubkey: poolSource, isSigner: false, isWritable: true },
    { pubkey: poolDestination, isSigner: false, isWritable: true },
    { pubkey: userDestination, isSigner: false, isWritable: true },
    { pubkey: poolMint, isSigner: false, isWritable: true },
    { pubkey: feeAccount, isSigner: false, isWritable: true },
    { pubkey: tokenProgramId, isSigner: false, isWritable: false },
  ];

  // optional depending on the build of token-swap program
  if (programOwner) {
    keys.push({ pubkey: programOwner, isSigner: false, isWritable: true });
  }

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 1, // Swap instruction
      amountIn,
      minimumAmountOut,
    },
    data
  );

  return new TransactionInstruction({
    keys,
    programId: swapProgramId,
    data,
  });
};

export const mercurialSwapInstruction = (
  swapInfo: PublicKey,
  authority: PublicKey,
  userTransferAuthority: PublicKey,
  tokenAccounts: string[],
  userSourceTokenAccount: PublicKey,
  userDestinationTokenAccount: PublicKey,
  inAmount: number,
  minimumAmountOut: number,
  swapProgramId:PublicKey
): TransactionInstruction => {

  const dataLayout = struct([
    u8("instruction"),
    nu64("inAmount"),
    nu64("minimumAmountOut"),
  ]);

  const keys = [
    { pubkey: swapInfo, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: userTransferAuthority, isSigner: true, isWritable: false },

    ...tokenAccounts.map((tokenAccount:string) => ({ pubkey: new PublicKey(tokenAccount), isSigner: false, isWritable: true })),

    { pubkey: userSourceTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userDestinationTokenAccount, isSigner: false, isWritable: true }
  ]

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 4, // exchange instruction
      inAmount,
      minimumAmountOut,
    },
    data
  );

  return new TransactionInstruction({
    keys,
    programId: swapProgramId,
    data,
  });
};


interface LiquidityPoolInfo {
    name: string
    coin: TokenInfo
    pc: TokenInfo
    lp: TokenInfo
  
    version: number
    programId: string
  
    ammId: string
    ammAuthority: string
  
    poolCoinTokenAccount: string
    poolPcTokenAccount: string
    feeAccount: string
    official: boolean
}
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const STABLE_LP_TOKENS:Tokens= {
  'USDT-wUSDTv2': {
    symbol: 'USDT-wWUSDT',
    name: 'USDT-wWUSDT Atlas LP',
    coin: { ...TOKENS.USDT },
    pc: { ...TOKENS.wUSDTv2 },
    mintAddress: '9oedAN1eyfvojmVfNKdZVNVCQUUSp85C3Sg14zv35uA8',
    decimals: 8,
  },
}

export const MERCURIAL_POOLS = {
  wUSD4Pool:{
    name: 'wUSD-4Pool',
    programId: 'MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky',
    ammId: 'USD42Jvem43aBSLqT83GZmvRbzAjpKBonQYBQhni7Cv',
    ammAuthority: '3m15qNJDM5zydsYNJzkFYXE7iGCVnkKz1mrmbawrDUAH',
    accounts:[
      '54q2ct7kTknGvADuHSXjtnKqMbmNQ4xpDVK2xgcnh1xv',
      '5cvqiPREvEYmhvBt3cZ7fmrCE6tbYvwkAiuvf1pHUPBq',
      '9gVstb8HkuYX8PqjLSc9b9zLMhFZwWX7k3ofLcWy7wyS',
      'HLdcfovcXkHKm4iQWNQZhJypySmuGa1PGoTuB6L68hhZ'
    ]
  }
}

export const STABLE_POOLS: any = {
  USDT:{
    name: 'USDT-wWUSDT',
    version: 1,
    coin: {...TOKENS.USDT},
    pc: {...TOKENS.wUSDTv2},
    lp:{...STABLE_LP_TOKENS['USDT-wUSDTv2']},
    programId: '2E5cDaVrPPMp1a6Q7PNookgd48yUidJKgrf9as5ezWwF',

    ammId: '6BEvCZxbojJ9CL4wdczGPmtYEjKPdMo3E9ZThqSGyFfr',
    ammAuthority: '9qrDnhLpG4yzNkSYrweEXV7tcvRfV3NUwqEu1iydZx11',
    poolCoinTokenAccount: '55YzKTs8vMJXaUvCfjgcWBsvAdmYZuigbMmf5jThfkKy',
    poolPcTokenAccount: 'EYm1f2beGNcjEmN5crD3TFyfSoC1b94Y6N95nHrS3e6q',
    feeAccount: '2ZFYCkSVBfWykfXWJoowZDtxxXTya636VHw78Cd1hXCs',
    official:true,
  },
    USDC:{
        name: 'USDC-wWUSDC',
        version: 1,
        coin: {...TOKENS.USDC},
        pc: {...TOKENS.wUSDTv2},
        lp:{...STABLE_LP_TOKENS['USDT-wUSDTv2']},
        programId: '2E5cDaVrPPMp1a6Q7PNookgd48yUidJKgrf9as5ezWwF',
    
        ammId: '8M9wyEdtxVCxayEkwsBsNpyjwLTQhtquA3YCLQryV4Qs',
        ammAuthority: 'dhXGxdK3EWitjasUAbJNdXGnSsQBt8sCjKpx36JU8JH',
        poolCoinTokenAccount: 'BR1poDF1aXfTNKSUSVrTxD2mKrbcYo7Sdtr7jwV6FsaC',
        poolPcTokenAccount: 'GJoEeet6HfK7t1YJNHPjkh33zV2ZeEwmui3YAsRVFE4',
        feeAccount: 'DK4VFpFuUQKCmDQ7bHMod1Ltzz7NP8koFaz9E6crfMM3',
        official:true,
      },
}
    
  
export async function stableSwap(
    connection: Connection,
    wallet: any,
    poolInfo: LiquidityPoolInfo,
    fromCoinMint: string,
    toCoinMint: string,
    fromTokenAccount: string,
    toTokenAccount: string,
    aIn: string,
    aOut: string
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
  const amountOut = new TokenAmount(aOut, to.decimals, false)
  let fromMint = fromCoinMint
  let toMint = toCoinMint

  if (fromMint === NATIVE_SOL.mintAddress) {
    fromMint = TOKENS.WSOL.mintAddress
  }
  if (toMint === NATIVE_SOL.mintAddress) {
    toMint = TOKENS.WSOL.mintAddress
  }

  let wrappedSolAccount: PublicKey | null = null
  let wrappedSolAccount2: PublicKey | null = null

  if (fromCoinMint === NATIVE_SOL.mintAddress) {
    wrappedSolAccount = await createTokenAccountIfNotExist(
      connection,
      wrappedSolAccount,
      owner,
      TOKENS.WSOL.mintAddress,
      getBigNumber(amountIn.wei) + 1e7,
      transaction,
      signers
    )
  }
  if (toCoinMint === NATIVE_SOL.mintAddress) {
    wrappedSolAccount2 = await createTokenAccountIfNotExist(
      connection,
      wrappedSolAccount2,
      owner,
      TOKENS.WSOL.mintAddress,
      1e7,
      transaction,
      signers
    )
  }

  const newFromTokenAccount = await createAssociatedTokenAccountIfNotExist(fromTokenAccount, owner, fromMint, transaction)
  const newToTokenAccount = await createAssociatedTokenAccountIfNotExist(toTokenAccount, owner, toMint, transaction)
  
  transaction.add(
      atlasSwapInstruction(
          new PublicKey(poolInfo.ammId),
          new PublicKey(poolInfo.ammAuthority),
          wallet.publicKey,
          wrappedSolAccount ?? newFromTokenAccount,
          new PublicKey(poolInfo.poolCoinTokenAccount),
          new PublicKey(poolInfo.poolPcTokenAccount),
          wrappedSolAccount2 ?? newToTokenAccount,
          new PublicKey(poolInfo.lp.mintAddress),
          new PublicKey(poolInfo.feeAccount),
          new PublicKey(poolInfo.programId),
          TOKEN_PROGRAM_ID,
          Math.floor(getBigNumber(amountIn.toWei())),
          Math.floor(getBigNumber(amountOut.toWei())),
          undefined
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