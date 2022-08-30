import { initRaydium, InitParams } from './sdk'
import { Percent, Numberish, getAssociatedPoolKeys, SPL_MINT_LAYOUT, PublicKeyish, TokenAmount } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

interface AddLiquidity extends InitParams {
  poolId: string
  inputTokenAmount: TokenAmount
}

export async function addLiquidity(params: AddLiquidity) {
  const { connection, owner, poolId, inputTokenAmount } = params
  const raydium = await initRaydium({ connection, owner })

  // after initialization, pools data can get by raydium.liquidity.allPools
  // reference pools: https://api.raydium.io/v2/sdk/liquidity/mainnet.json

  // this demo uses SOL - USDC pool as example
  // poolId: 58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2

  const poolInfo = raydium?.liquidity.allPoolMap.get(poolId)!
  const isInputTokenA = inputTokenAmount.token.mint.toBase58() === poolInfo.baseMint

  // will return anotherAmount and maxAnotherAmount
  const pairTokenData = await raydium!.liquidity.computePairAmount({
    poolId,
    amount: inputTokenAmount,
    anotherToken: raydium!.mintToToken(isInputTokenA ? poolInfo.quoteMint : poolInfo.baseMint),
    slippage: new Percent(1, 100),
  })

  const { execute, signers, transaction } = await raydium!.liquidity.addLiquidity({
    poolId,
    amountInA: isInputTokenA ? inputTokenAmount : pairTokenData.maxAnotherAmount,
    amountInB: isInputTokenA ? pairTokenData.maxAnotherAmount : inputTokenAmount,
    fixedSide: raydium!.liquidity.getFixedSide({ poolId, inputMint: inputTokenAmount.token.mint }),
  })

  const txId = await execute()
}

interface RemoveLiquidity extends InitParams {
  poolId: string
  lpAmount: Numberish
}

export async function removeLiquidity(params: RemoveLiquidity) {
  const { connection, owner, poolId, lpAmount } = params
  const raydium = await initRaydium({ connection, owner })

  const { transaction, signers, execute } = await raydium!.liquidity.removeLiquidity({
    poolId,
    amountIn: raydium!.liquidity.lpMintToTokenAmount({ poolId, amount: lpAmount }),
    // raydium!.liquidity.lpMintToTokenAmount will auto generate lp token info
  })

  const txId = await execute()
}

interface CreatePool extends InitParams {
  marketId: PublicKeyish
  baseMint: PublicKeyish
  quoteMint: PublicKeyish
}

export async function createPool(params: CreatePool) {
  const { connection, owner, baseMint, quoteMint, marketId } = params
  const raydium = await initRaydium({ connection, owner })

  /**
   * marketId: serum market id, follow this guide https://docs.projectserum.com/serum-ecosystem/build-on-serum/add-a-market-on-serum-serum-academy
   * baseMint: pool first token mint, e.g. SOL
   * quoteMint: pool second token mint, e.g. USDC
   */

  const associatedPoolKeys = await getAssociatedPoolKeys({
    version: 4,
    baseMint,
    quoteMint,
    marketId,
  })
  const { lpMint } = associatedPoolKeys
  const lpMintInfoOnChain = (await connection.getAccountInfo(new PublicKey(lpMint)))?.data
  const isAlreadyCreated = Boolean(lpMintInfoOnChain?.length && Number(SPL_MINT_LAYOUT.decode(lpMintInfoOnChain).supply) === 0)

  if (!isAlreadyCreated) {
    const { transaction, signers, execute } = await raydium!.liquidity.createPool({
      version: 4,
      baseMint,
      quoteMint,
      marketId,
    })
    const txId = execute()
  }

  const { transaction, signers, execute } = await raydium!.liquidity.initPool({
    version: 4,
    baseMint,
    quoteMint,
    marketId,
    baseAmount: raydium!.mintToTokenAmount({ mint: baseMint, amount: 20 }),
    quoteAmount: raydium!.mintToTokenAmount({ mint: quoteMint, amount: 20 }),
  })
  const txId = execute()
}
