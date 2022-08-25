import { initRaydium, InitParams } from './sdk'
import { Percent, PublicKeyish } from '@raydium-io/raydium-sdk'

interface SwapParams extends InitParams {
  inToken: PublicKeyish
  outToken: PublicKeyish
  amount: number | string
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

  const { transaction, signers, execute, extInfo } = await raydium!.trade.swap({
    routes,
    routeType,
    amountIn: inTokenAmount,
    amountOut: minAmountOut,
    fixedSide: 'in',
  })

  // extInfo will return "amountOut" TokenAmount object, extInfo.amountOut.toExact() can get out amount
  return await execute()
}

export async function directSwap(params: SwapParams) {
  const { connection, owner, inToken, outToken, amount } = params
  const raydium = await initRaydium({ connection, owner })
  const inTokenAmount = raydium.mintToTokenAmount({ mint: inToken, amount })

  const { transaction, signers, execute, extInfo } = await raydium!.trade.directSwap({
    amountIn: raydium!.mintToTokenAmount({ mint: inToken, amount: inTokenAmount })!,
    amountOut: raydium!.mintToTokenAmount({ mint: outToken, amount: '0' })!,
    fixedSide: 'in',
    slippage: new Percent(1, 100),
  })
  // extInfo will return "amountOut" TokenAmount object, extInfo.amountOut.toExact() can get out amount
  return await execute() // execute tx
}
