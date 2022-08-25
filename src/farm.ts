import { initRaydium, InitParams } from './sdk'
import { PublicKeyish, Numberish, validateAndParsePublicKey } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

interface FarmDeposit extends InitParams {
  farmId: PublicKeyish
  lpAmount: Numberish
}

export async function deposit(params: FarmDeposit) {
  const { connection, owner, farmId, lpAmount } = params
  const raydium = await initRaydium({ connection, owner })
  await raydium.farm.load() // load and parse farm data
  // https://api.raydium.io/v2/sdk/farm-v2/mainnet.json <= farm reference
  // example SOL-USDC farmId: 'GUzaohfNuFbBqQTnPgPSNciv3aUvriXYjQduRE3ZkqFw'

  const targetFarm = raydium.farm.getParsedFarm(farmId)

  const { execute, transaction } = await raydium.farm.deposit({
    farmId: new PublicKey(farmId),
    amount: raydium.farm.lpDecimalAmount({
      mint: targetFarm.lpMint,
      amount: lpAmount,
    }),
  })

  const txId = await execute()
}

interface FarmWithdraw extends InitParams {
  farmId: PublicKeyish
  lpAmount: Numberish
}

export async function withdraw(params: FarmWithdraw) {
  const { connection, owner, farmId, lpAmount } = params
  const raydium = await initRaydium({ connection, owner })
  await raydium.farm.load() // load and parse farm data

  const { execute, transaction } = await raydium.farm.withdraw({
    farmId: new PublicKey(farmId),
    amount: lpAmount,
  })
  const txId = await execute()
}

export async function harvest(params: Omit<FarmWithdraw, 'lpAmount'>) {
  const { connection, owner, farmId } = params
  const raydium = await initRaydium({ connection, owner })
  await raydium.farm.load() // load and parse farm data

  // withdraw will occur harvest event, so just set amount to 0
  await withdraw({ ...params, lpAmount: 0 })
}

interface CreateFarm extends InitParams {
  poolId: PublicKeyish
  rewardMint: PublicKey
  rewardPerSecond: Numberish
  rewardOpenTime: Numberish
  rewardEndTime: Numberish
}

export async function createFarm(params: CreateFarm) {
  const { connection, owner, poolId, rewardOpenTime, rewardEndTime, rewardPerSecond, rewardMint } = params
  const raydium = await initRaydium({ connection, owner })

  const poolPubkey = validateAndParsePublicKey({ publicKey: poolId })

  /**
   * example reward info
   * rewardMint: PublicKey.default <= PublicKey.default means SOL or new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
   * rewardOpenTime: new Date('2022/12/20').getTime() / 1000
   * rewardEndTime: new Date('2022/12/27').getTime() / 1000
   */

  const { execute, transaction } = await raydium.farm.create({
    poolId: poolPubkey,
    rewardInfos: [
      {
        rewardMint,
        rewardPerSecond,
        rewardOpenTime,
        rewardEndTime,
      },
    ],
  })

  const txId = await execute()
}
