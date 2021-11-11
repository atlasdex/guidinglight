export interface ParsedTokenAccount {
  publicKey: string;
  mintKey: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
  symbol?: string;
  name?: string;
  logo?: string;
  isNativeAsset?: boolean;
}

// these all are optional so NFT could share TokenSelectors
export interface NFTParsedTokenAccount extends ParsedTokenAccount {
  tokenId?: string;
  uri?: string;
  // eslint-disable-next-line camelcase
  animation_url?: string | null;
  // eslint-disable-next-line camelcase
  external_url?: string | null;
  image?: string;
  // eslint-disable-next-line camelcase
  image_256?: string;
  nftName?: string;
  description?: string;
}

export function createParsedTokenAccount(
  publicKey: string,
  mintKey: string,
  amount: string,
  decimals: number,
  uiAmount: number,
  uiAmountString: string,
  symbol?: string,
  name?: string,
  logo?: string,
  isNativeAsset?: boolean
): ParsedTokenAccount {
  return {
    publicKey,
    mintKey,
    amount,
    decimals,
    uiAmount,
    uiAmountString,
    symbol,
    name,
    logo,
    isNativeAsset,
  };
}

export function createNFTParsedTokenAccount(
  publicKey: string,
  mintKey: string,
  amount: string,
  decimals: number,
  uiAmount: number,
  uiAmountString: string,
  tokenId: string,
  symbol?: string,
  name?: string,
  uri?: string,
  animationUrl?: string,
  externalUrl?: string,
  image?: string,
  image256?: string,
  nftName?: string,
  description?: string
): NFTParsedTokenAccount {
  return {
    publicKey,
    mintKey,
    amount,
    decimals,
    uiAmount,
    uiAmountString,
    tokenId,
    uri,
    animation_url:animationUrl,
    external_url:externalUrl,
    image,
    image_256:image256,
    symbol,
    name,
    nftName,
    description,
  };
}