import {BigInt, near} from "@graphprotocol/graph-ts"
import {
  Action,
  ActionReceipt,
  BlockDetail,
  GeneratedReceipt,
  OutcomeReceipt,
  ReceiptDetails
} from "../generated/schema"

export function handleReceipt(
  receiptWithOutcome: near.ReceiptWithOutcome
): void {
  // Setting block details
  let block = receiptWithOutcome.block
  let blockDetail = BlockDetail.load(block.header.hash.toHexString())
  if (!blockDetail) {
	blockDetail = new BlockDetail(block.header.hash.toHexString())
	blockDetail.number = BigInt.fromI32(block.header.height as i32)
	blockDetail.timestamp = BigInt.fromU64(block.header.timestampNanosec);
	blockDetail.save()
  }

  // Assigning action receipts values to ActionReceipt
  let receipt = receiptWithOutcome.receipt
  let actionReceipt = new ActionReceipt(receipt.id.toHex())
  actionReceipt.receiverId = receipt.receiverId
  actionReceipt.signerId = receipt.signerId
  actionReceipt.signerPublicKey = receipt.signerPublicKey.bytes.toHexString()
  actionReceipt.gasPrice = receipt.gasPrice

  // Iterating through actions performed by receipts and storing in actionReceipt
  let actions: Array<string> = [];
  for (let i = 0; i < receipt.actions.length; i++) {
	let action = receipt.actions[i]
	let actionEntity = new Action(receipt.id.toHex() + "-" + action.kind.toString() + "-" + i.toString())
	// Checking the type of action performed and
	// assigning appropriate values
	if (action.kind == near.ActionKind.FUNCTION_CALL) {
	  let decodedAction = action.toFunctionCall()
	  actionEntity.methodCalled = decodedAction.methodName
	  actionEntity.args = decodedAction.args.toString()
	  actionEntity.deposit = decodedAction.deposit
	}
	if (action.kind == near.ActionKind.STAKE) {
	  let decodedAction = action.toStake()
	  actionEntity.deposit = decodedAction.stake
	}
	if (action.kind == near.ActionKind.TRANSFER) {
	  let decodedAction = action.toTransfer()
	  actionEntity.deposit = decodedAction.deposit
	}
	actionEntity.save()
	actions.push(actionEntity.id)
  }
  actionReceipt.actions = actions
  actionReceipt.save()

  // Assigning outcome values to OutcomeReceipt
  let outcome = receiptWithOutcome.outcome
  let outcomeReceipt = new OutcomeReceipt(outcome.id.toHex())
  outcomeReceipt.logs = outcome.logs
  outcomeReceipt.receiptIds = outcome.receiptIds.map<string>(value => {
	return value.toString()
  })
  outcomeReceipt.executorId = outcome.executorId
  outcomeReceipt.successStatus = outcomeReceipt.successStatus
  outcomeReceipt.save()

  // Assigning the Actions and Outcomes to ReceiptDetails
  let receiptDetails = new ReceiptDetails(receipt.id.toHex())
  receiptDetails.actionReceipt = actionReceipt.id
  receiptDetails.outcome = outcomeReceipt.id
  receiptDetails.save()

  // Assigning BlockDetails and ReceiptDetails to GeneratedReceipt
  let generatedReceipt = new GeneratedReceipt(receipt.id.toHex())
  generatedReceipt.blockDetail = blockDetail.id
  generatedReceipt.receiptDetails = receiptDetails.id
  generatedReceipt.save()
}
