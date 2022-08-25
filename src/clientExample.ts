import { getConnection, getKeyPair } from './txUtil'
import { initRaydium } from './sdk'
import { addLiquidity, removeLiquidity } from './liquidity'
import { deposit, withdraw } from './farm'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { parseTokenAccountResp } from '@raydium-io/raydium-sdk'

import { directSwap } from './swap'

export default async function ClientExample() {
  const connection = getConnection()
  const owner = getKeyPair()

  /**
   * Own token account data by dapp side
   */
  // const solAccountResp = await connection.getAccountInfo(owner.publicKey)
  // const tokenAccountResp = await connection.getTokenAccountsByOwner(owner.publicKey, { programId: TOKEN_PROGRAM_ID })
  // const tokenAccountData = parseTokenAccountResp({
  //   solAccountResp,
  //   tokenAccountResp,
  // })

  // only need to init once
  const raydium = await initRaydium({
    connection,
    owner,
    // ...tokenAccountData, //optional <= if dapp want to hold account by self, can pass this
  })

  // if you don't hold token account data, can subscribe to account update

  /**
   * access token account data
   * raydium.account.tokenAccounts
   * raydium.account.tokenAccountRawInfos
   *
   * 1. listen to token account changes, only works if you don't set token account
   * raydium.account.addAccountChangeListener((tokenAccountData) => {
   *   // ... do your own stuff
   * })
   *
   * 2. update self owned token account data to sdk
   * raydium.account.updateTokenAccount(tokenAccountData)
   */

  /**
   * raydium.setOwner <= update owner pubkey
   * raydium.setConnection <= update connection
   */

  const RAY_MINT = '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

  const swapTxId = await directSwap({
    connection,
    owner,
    inToken: RAY_MINT,
    outToken: USDC_MINT,
    amount: 10,
  })

  const rayUsdcPoolId = raydium.liquidity.allPools.find((poolInfo) => {
    return (
      (poolInfo.baseMint === RAY_MINT && poolInfo.quoteMint === USDC_MINT) ||
      (poolInfo.quoteMint === RAY_MINT && poolInfo.baseMint === USDC_MINT)
    )
  })!.id

  const addTxId = await addLiquidity({
    connection,
    owner,
    poolId: rayUsdcPoolId,
    // swap 10 ray to usdc, use raydium.mintToTokenAmount will auto generate token info
    inputTokenAmount: raydium.mintToTokenAmount({ mint: RAY_MINT, amount: 10 }),
  })

  const removeTxId = await removeLiquidity({
    connection,
    owner,
    poolId: rayUsdcPoolId,
    lpAmount: 0.2222, // lp token amount
  })

  const farmId = raydium.farm.allFarms.find((farmInfo) => {
    return (
      (farmInfo.baseMint === RAY_MINT && farmInfo.quoteMint === USDC_MINT) ||
      (farmInfo.quoteMint === RAY_MINT && farmInfo.baseMint === USDC_MINT)
    )
  })!.id

  const farmDepositTxId = await deposit({
    connection,
    owner,
    farmId,
    lpAmount: 1,
  })

  const farmWithdrawTxId = await withdraw({
    connection,
    owner,
    farmId,
    lpAmount: 1,
  })
}
