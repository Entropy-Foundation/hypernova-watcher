import { Schema } from "redis-om";

export const sourceEventSchema = new Schema('sourceEventSchema', {
  fromChainId: { type: 'string' },
  toChainId: { type: 'string' },
  amount: { type: 'string' },
  asset: { type: 'string' },
  msgId: { type: 'string' },
  receiverAddr: {type: 'string'},
  txHash: {type: 'string'}
}, {
  indexName: 'sourceEventIndex'
});

export const destEventSchema = new Schema('destEventSchema', { 
  fromChainId: { type: 'string' },
  toChainId: { type: 'string' },
  amount: { type: 'string' },
  asset: { type: 'string' },
  msgId: { type: 'string' },
  receiverAddr: {type: 'string'},
  txHash: {type: 'string'}
}, {
  indexName: 'destEventIndex'
});


export const sourceTxInputSchema = new Schema('sourceTxInputSchema', { 
  toChainId: { type: 'string' },
  amount: { type: 'string' },
  asset: { type: 'string' },
  txHash: { type: 'string' },
  receiverAddr: {type: 'string'}
})

export const destTxInputSchema = new Schema('destTxInputSchema', { 
  amount : { type: 'string' },
  asset : { type: 'string' },
  txHash: { type: 'string' },
  receiverAddr: { type: 'string' },
})