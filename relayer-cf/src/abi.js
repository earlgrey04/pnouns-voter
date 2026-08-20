// PNounsSnapVoter の必要最小限 ABI
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
    "name": "nounsProposalId",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "string",
    "name": "snapshotProposal",
    "type": "string"
   }
  ],
  "name": "ProposalRegistered",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "uint256",
    "name": "nounsProposalId",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "bytes32",
    "name": "snapHash",
    "type": "bytes32"
   }
  ],
  "name": "ProposalUnregistered",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "address",
    "name": "refundee",
    "type": "address"
   },
   {
    "indexed": false,
    "internalType": "uint256",
    "name": "refundAmount",
    "type": "uint256"
   },
   {
    "indexed": false,
    "internalType": "bool",
    "name": "refundSent",
    "type": "bool"
   }
  ],
  "name": "RefundableVote",
  "type": "event"
 },
 {
  "anonymous": false,
  "inputs": [
   {
    "indexed": true,
    "internalType": "uint256",
    "name": "nounsProposalId",
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
    "internalType": "uint32",
    "name": "counted",
    "type": "uint32"
   },
   {
    "indexed": false,
    "internalType": "uint64",
    "name": "timestamp",
    "type": "uint64"
   },
   {
    "indexed": false,
    "internalType": "bool",
    "name": "revote",
    "type": "bool"
   }
  ],
  "name": "SnapVoteCounted",
  "type": "event"
 },
 {
  "inputs": [
   {
    "components": [
     {
      "internalType": "string",
      "name": "from",
      "type": "string"
     },
     {
      "internalType": "uint64",
      "name": "timestamp",
      "type": "uint64"
     },
     {
      "internalType": "string",
      "name": "proposal",
      "type": "string"
     },
     {
      "internalType": "uint32",
      "name": "choice",
      "type": "uint32"
     },
     {
      "internalType": "string",
      "name": "reason",
      "type": "string"
     },
     {
      "internalType": "string",
      "name": "app",
      "type": "string"
     },
     {
      "internalType": "string",
      "name": "metadata",
      "type": "string"
     },
     {
      "internalType": "bytes",
      "name": "signature",
      "type": "bytes"
     },
     {
      "internalType": "uint256[]",
      "name": "tokenIds",
      "type": "uint256[]"
     }
    ],
    "internalType": "struct PNounsSnapVoter.SnapVote[]",
    "name": "votes",
    "type": "tuple[]"
   }
  ],
  "name": "castSnapshotVotes",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
 },
 {
  "inputs": [
   {
    "internalType": "uint256",
    "name": "nounsProposalId",
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
   }
  ],
  "name": "castVote",
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
    "name": "proposalId",
    "type": "uint256"
   },
   {
    "internalType": "address",
    "name": "voter",
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
    "name": "",
    "type": "uint256"
   }
  ],
  "name": "nounsToSnap",
  "outputs": [
   {
    "internalType": "bytes32",
    "name": "",
    "type": "bytes32"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "refundEnabled",
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
   }
  ],
  "name": "refundedForProposal",
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
    "name": "",
    "type": "uint256"
   }
  ],
  "name": "registeredAtBlock",
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
  "inputs": [],
  "name": "owner",
  "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "registrar",
  "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
  "name": "eligibleAtBlock",
  "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "registrationDelayBlocks",
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
    "internalType": "bytes32",
    "name": "",
    "type": "bytes32"
   }
  ],
  "name": "snapToNouns",
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
    "name": "",
    "type": "uint256"
   }
  ],
  "name": "snapshotVotesAccepted",
  "outputs": [
   {
    "internalType": "uint32",
    "name": "",
    "type": "uint32"
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
   }
  ],
  "name": "snapshotVotesCounted",
  "outputs": [
   {
    "internalType": "uint32",
    "name": "",
    "type": "uint32"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 },
 {
  "inputs": [],
  "name": "spaceHash",
  "outputs": [
   {
    "internalType": "bytes32",
    "name": "",
    "type": "bytes32"
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
  "name": "voterRec",
  "outputs": [
   {
    "internalType": "bool",
    "name": "exists",
    "type": "bool"
   },
   {
    "internalType": "uint8",
    "name": "support",
    "type": "uint8"
   },
   {
    "internalType": "uint32",
    "name": "counted",
    "type": "uint32"
   },
   {
    "internalType": "uint64",
    "name": "timestamp",
    "type": "uint64"
   },
   {
    "internalType": "bytes32",
    "name": "digest",
    "type": "bytes32"
   }
  ],
  "stateMutability": "view",
  "type": "function"
 }
];
