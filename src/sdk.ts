import { Raydium } from '@raydium-io/raydium-sdk'
import { Connection, Keypair, PublicKey, Transaction, SendOptions, Signer } from '@solana/web3.js'

let raydium: Raydium | undefined

export interface InitParams {
  connection: Connection
  reload?: boolean
  owner?: PublicKey | Keypair
  sendTransaction?: (
    transaction: Transaction,
    connection: Connection,
    options?: SendOptions & {
      signers: Signer[]
    },
  ) => Promise<string>
}

export async function initRaydium(params: InitParams) {
  const { connection, owner, reload } = params
  if (raydium && !reload) return raydium

  raydium = await Raydium.load({ connection, owner })
  return raydium
}
