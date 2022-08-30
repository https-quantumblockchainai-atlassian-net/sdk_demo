import { initRaydium, InitParams } from './sdk'
import { jsonInfo2PoolKeys, Percent, PublicKeyish } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

interface SwapParams extends InitParams {
  inToken: PublicKeyish
  outToken: PublicKeyish
  amount: number | string
}

export async function directSwap(params: SwapParams) {
  const { connection, owner, inToken, outToken, amount } = params
  const raydium = await initRaydium({ connection, owner })
  const inTokenAmount = raydium.mintToTokenAmount({ mint: inToken, amount })

  const { transactions, signers, execute, extInfo } = await raydium!.trade.directSwap({
    amountIn: raydium!.mintToTokenAmount({ mint: inToken, amount: inTokenAmount })!,
    amountOut: raydium!.mintToTokenAmount({ mint: outToken, amount: '0' })!,
    fixedSide: 'in',
    slippage: new Percent(1, 100),
  })
  // extInfo will return "amountOut" TokenAmount object, extInfo.amountOut.toExact() can get out amount
  return await execute() // execute tx
}

export async function swap(params: SwapParams) {
  const { connection, owner, inToken, outToken, amount } = params

  const raydium = await initRaydium({ connection, owner })

  // get all available swap pools
  // *** PublicKey.default means SOL token ***
  const { availablePools, best, routedPools } = await raydium.trade.getAvailablePools({
    inputMint: inToken,
    outputMint: outToken,
  })!
  const inTokenAmount = raydium.mintToTokenAmount({ mint: inToken, amount })

  const {
    amountOut: _amountOut,
    minAmountOut,
    routes,
    routeType,
  } = await raydium!.trade.getBestAmountOut({
    pools: routedPools, // optional, pass only if called getAvailablePools
    amountIn: inTokenAmount,
    inputToken: raydium!.mintToToken(inToken),
    outputToken: raydium!.mintToToken(outToken),
    slippage: new Percent(1, 100),
  })

  const { transactions, signers, execute, extInfo } = await raydium!.trade.swap({
    routes,
    routeType,
    amountIn: inTokenAmount,
    amountOut: minAmountOut,
    fixedSide: 'in',
  })

  // extInfo will return "amountOut" TokenAmount object, extInfo.amountOut.toExact() can get out amount
  return await execute()
}

interface AMMSwapParams extends InitParams {
  inToken: PublicKeyish
  outToken: PublicKeyish
  poolId: PublicKey
  amount: number | string
}

export async function ammSwap(params: AMMSwapParams) {
  const { connection, poolId, owner, inToken, outToken, amount } = params

  const raydium = await initRaydium({ connection, owner })

  /**
   * example
   * poolId: 6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg
   * inToken: 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R
   * outToken: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
   */
  const inTokenAmount = raydium.mintToTokenAmount({ mint: inToken, amount })
  const poolKeys = jsonInfo2PoolKeys(raydium.liquidity.allPoolMap.get(poolId.toBase58())!)
  const [poolInfo] = await raydium.liquidity.fetchMultipleInfo({ pools: [poolKeys] })

  const { amountOut, minAmountOut } = await raydium!.liquidity.computeAmountOut({
    poolInfo,
    poolKeys,
    amountIn: inTokenAmount,
    outputToken: raydium!.mintToToken(outToken),
    slippage: new Percent(1, 100),
  })

  const { transactions, signers, execute, extInfo } = await raydium!.liquidity.swapWithAMM({
    poolKeys,
    amountOut: minAmountOut,
    amountIn: inTokenAmount,
    fixedSide: 'in',
  })
  // extInfo will return "amountOut" TokenAmount object, extInfo.amountOut.toExact() can get out amount
  return await execute()
}

interface RouteSwapParams extends InitParams {
  inToken: PublicKeyish
  outToken: PublicKeyish
  fromPoolId: PublicKey
  outPoolId: PublicKey
  amount: number | string
}

export async function routeSwap(params: RouteSwapParams) {
  const { connection, owner, inToken, outToken, fromPoolId, outPoolId, amount } = params

  const raydium = await initRaydium({ connection, owner })
  const inTokenAmount = raydium.mintToTokenAmount({ mint: inToken, amount })
  const outputToken = raydium.mintToToken(outToken)

  /**
   * example
   * inToken: 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R RAY
   * outToken: 9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E  BTC
   * fromPool:  6gpZ9JkLoYvpA5cwdyPZFsDw6tkbPyyXM5FqRqHxMCny  ray-msol
   * toPool: ynV2H2b7FcRBho2TvE25Zc4gDeuu2N45rUw9DuJYjJ9  btc-msol
   */
  const fromPoolKeys = jsonInfo2PoolKeys(raydium.liquidity.allPoolMap.get(fromPoolId.toBase58())!)
  const toPoolKeys = jsonInfo2PoolKeys(raydium.liquidity.allPoolMap.get(outPoolId.toBase58())!)
  const [fromPoolInfo, toPoolInfo] = await raydium.liquidity.fetchMultipleInfo({ pools: [fromPoolKeys, toPoolKeys] })

  const { amountOut, minAmountOut } = await raydium!.route.computeRouteAmountOut({
    fromPoolKeys,
    toPoolKeys,
    fromPoolInfo,
    toPoolInfo,
    amountIn: inTokenAmount,
    outputToken,
    slippage: new Percent(1, 100),
  })

  const { transactions, signers, execute, extInfo } = await raydium!.route.swapWithRoute({
    fromPoolKeys,
    toPoolKeys,
    amountOut: minAmountOut,
    amountIn: inTokenAmount,
    fixedSide: 'in',
  })
  // extInfo will return "amountOut" TokenAmount object, extInfo.amountOut.toExact() can get out amount
  return await execute()
}
