// PNounsMetaGov の必要最小限 ABI(artifacts から抽出)
export const METAGOV_ABI = [
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "uint256",
    "name": "proposalId",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "uint8",
    "name": "support",
    "type": "uint8"
   },
   {
    "indexed": false,
    "internalType": "uint256[3]",
    "name": "tokens",
    "type": "uint256[3]"
   },
   {
    "indexed": false,
    "internalType": "uint256[3]",
    "name": "voters",
    "type": "uint256[3]"
   },
   {
    "indexed": false,
    "internalType": "bool",
    "name": "live",
    "type": "bool"
   }
  ],
  "name": "Executed",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "uint256",
    "name": "proposalId",
    "type": "uint256"
   },
   {
    "indexed": true,
    "internalType": "address",
    "name": "voter",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint8",
    "name": "support",
    "type": "uint8"
   },
   {
    "indexed": false,
    "internalType": "uint256[]",
    "name": "tokenIds",
    "type": "uint256[]"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "counted",
    "type": "uint256"
   }
  ],
  "name": "VoteCast",
  "type": "event"
 },
 {
  "inputs": [
   {
    "components": [
     {
      "internalType": "uint256",
      "name": "proposalId",
      "type": "uint256"
     },
     {
      "internalType": "uint8",
      "name": "support",
      "type": "uint8"
     },
     {
      "internalType": "uint256[]",
      "name": "tokenIds",
      "type": "uint256[]"
     },
     {
      "internalType": "bytes",
      "name": "signature",
      "type": "bytes"
     }
    ],
    "internalType": "struct PNounsMetaGov.VoteSig[]",
    "name": "votes",
    "type": "tuple[]"
   }
  ],
  "name": "castVotesBySig",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "proposalId",
    "type": "uint256"
   }
  ],
  "name": "currentResult",
  "outputs": [
   {
    "internalType": "uint8",
    "name": "",
    "type": "uint8"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "name": "excluded",
  "outputs": [
   {
    "internalType": "bool",
    "name": "",
    "type": "bool"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "proposalId",
    "type": "uint256"
   }
  ],
  "name": "execute",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "proposalId",
    "type": "uint256"
   },
   {
    "internalType": "uint256",
    "name": "tokenId",
    "type": "uint256"
   }
  ],
  "name": "hasTokenVoted",
  "outputs": [
   {
    "internalType": "bool",
    "name": "",
    "type": "bool"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   },
   {
    "internalType": "address",
    "name": "",
    "type": "address"
   }
  ],
  "name": "hasVoted",
  "outputs": [
   {
    "internalType": "bool",
    "name": "",
    "type": "bool"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "liveMode",
  "outputs": [
   {
    "internalType": "bool",
    "name": "",
    "type": "bool"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "marginBlocks",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "proposalId",
    "type": "uint256"
   }
  ],
  "name": "tally",
  "outputs": [
   {
    "internalType": "uint256[3]",
    "name": "tokens",
    "type": "uint256[3]"
   },
   {
    "internalType": "uint256[3]",
    "name": "voters",
    "type": "uint256[3]"
   },
   {
    "internalType": "bool",
    "name": "executed",
    "type": "bool"
   },
   {
    "internalType": "uint8",
    "name": "result",
    "type": "uint8"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "proposalId",
    "type": "uint256"
   }
  ],
  "name": "voteDeadline",
  "outputs": [
   {
    "internalType": "uint256",
    "name": "",
    "type": "uint256"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 }
];
