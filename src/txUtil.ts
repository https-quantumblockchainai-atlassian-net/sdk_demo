import { Connection, Keypair } from '@solana/web3.js'
import bs58 from 'bs58'

export const getConnection = () => new Connection('https://api.devnet.solana.com', 'confirmed')

export const getKeyPair = () => {
  // change to your privateKey
  // const secretKey = Buffer.from(JSON.parse('[1,1,1,1,1]'))
  const secretKey = bs58.decode('3qswEeCJcA9ogpN3JEuXBtmnU35YPzSxBwzrk6sdTPhogMJ64WuabU9XWg2yUegJvv1qupYPqo2jQrrK26N7HGsD')
  const keyPair = Keypair.fromSecretKey(secretKey)

  return keyPair
}
