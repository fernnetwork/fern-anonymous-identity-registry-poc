
'use strict'

const fs = require('fs')
const inquirer = require('inquirer')
const Web3 = require('web3')
const tempStorage = require('../temp-storage')
const { abi: contractAbi } = require('../../../truffle/build/contracts/AnonymousIdentityRegistry.json')

const createEntryHash = (tag, entry) => Web3.utils.soliditySha3({ t: 'uint256[2]', v: tag }, { t: 'address', v: entry })

const providerRegex = /(?:(?:http)|(?:ws)):\/\/.+/
const providerPrompt = {
  message: 'What is web3 provider endpoint',
  name: 'providerUrl',
  type: 'input',
  default: tempStorage.get('providerUrl') || 'ws://localhost:8546',
  validate: (providerUrl) => {
    return providerRegex.test(providerUrl) || 'Invalid provider address'
  }
}

const ethRegex = /\b(?:0x)?[a-f0-9]{40}\b/i
const contractAddressPrompt = {
  message: 'What is the AnonymousIdentityRegistry contract address',
  name: 'contractAddress',
  type: 'input',
  default: tempStorage.get('contractAddress') || '0x5A96700CE6C818Aca4706AfcDEe00F94AEb07Ebc',
  validate: (contractAddress) => {
    return ethRegex.test(contractAddress) || 'Invalid contract address'
  }
}

const listIdPrompt = {
  message: 'What is the list ID',
  name: 'listId',
  type: 'input',
  default: tempStorage.get('listId') || 'a5dcc693-5304-418c-ae91-2733c11c60e7',
  validate: (listId) => {
    return !!listId || 'Empty list ID'
  }
}

const anonymousIdAddressPrompt = {
  message: 'What is the anonymous identity address',
  name: 'anonymousIdAddress',
  type: 'input',
  default: tempStorage.get('anonymousIdAddress') || '0x00Ea169ce7e0992960D3BdE6F5D539C955316432',
  validate: (anonymousIdAddress) => {
    return ethRegex.test(anonymousIdAddress) || 'Invalid anonymous identity address'
  }
}

const signaturePrompt = {
  message: 'What is location of the signature.json file',
  name: 'signatureJSONPath',
  type: 'input',
  default: 'out/signature.json',
  validate: (signatureJSONPath) => {
    const signature = readJSONFromFile(signatureJSONPath)
    return (signature && !!signature.pkeys && !!signature.tag && !!signature.tees && !!signature.seed) ||
      'Invalid signature.json file'
  }
}

const fromAddressPrompt = {
  message: 'What is the sender address',
  name: 'fromAddress',
  type: 'input',
  default: tempStorage.get('fromAddress') || '0x00Ea169ce7e0992960D3BdE6F5D539C955316432',
  validate: (fromAddress) => {
    return ethRegex.test(fromAddress) || 'Invalid sender address'
  }
}

exports.execute = async function () {
  const { providerUrl, contractAddress, listId, anonymousIdAddress, signatureJSONPath, fromAddress } = await inquirer.prompt([
    providerPrompt,
    contractAddressPrompt,
    listIdPrompt,
    anonymousIdAddressPrompt,
    signaturePrompt,
    fromAddressPrompt
  ])

  const web3 = new Web3(providerUrl)
  const anonymousIdentityRegistry = new web3.eth.Contract(contractAbi, contractAddress)

  const { tag, tees, seed } = readJSONFromFile(signatureJSONPath)
  const commitHash = createEntryHash(tag, anonymousIdAddress)

  await anonymousIdentityRegistry.methods.commitToList(listId, commitHash)
    .send({ from: fromAddress })
  console.log(`Successfully committed hash "${commitHash}" to list ${listId}`)

  await anonymousIdentityRegistry.methods.addToList(listId, anonymousIdAddress, tag, tees, seed)
    .send({ from: fromAddress, gas: 2000000 })

  return `Successfully added anonymous ID "${anonymousIdAddress}" to list ${listId}`
}

function readJSONFromFile(path) {
  const fileContent = fs.readFileSync(path)
  return JSON.parse(fileContent)
}
