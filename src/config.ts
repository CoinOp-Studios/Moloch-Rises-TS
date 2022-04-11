import { AddressMap } from './types';

export const AVATAR_CONTRACTS: AddressMap = {
  "0x13881": "0x186A5CdAABdD63F27134067a7B3d37308F7dFeE8"
};

export const BOARD_CONTRACTS: AddressMap = {
  "0x13881": "0x420d681e8E26823F38487e83c337cfCD26736521"
};

export const GRAPH_ENDPOINTS: AddressMap = {
  "0x13881": "https://api.thegraph.com/subgraphs/name/0xbeedao/all-mumbai-nfts"
};

export const USER_TOKEN_Q: string = `
query UserTokens($owner: String!) {
  tokens(where: { owner: $owner }) {
    id,
    owner,
    uri
  }
}
`;
