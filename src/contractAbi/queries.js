import Crypto from 'crypto-js';
import { gql, request } from 'graphql-request';

import { GRAPH_ENDPOINTS, USER_TOKEN_Q } from '../config';

export function base64ToJSON(bytes) {
  const str = Crypto.enc.Base64.parse(bytes).toString(Crypto.enc.Utf8);
  return JSON.parse(str);
}

/* let client = null;

export async function getClient(provider) {
  if (client) {
    return client;
  }
  const network = await provider.getNetwork();

  const chainId = `0x${network.chainId.toString(16)}`;
  const endpoint = GRAPH_ENDPOINTS[chainId];
  const cache = new InMemoryCache();
  client = new ApolloClient({
    // Provide required constructor fields
    cache: cache,
    uri: endpoint,
  });
  return client;
}; */

export async function getTokens(provider, address) {
  const network = await provider.getNetwork();
  const chainId = `0x${network.chainId.toString(16)}`;
  const endpoint = GRAPH_ENDPOINTS[chainId];
  const query = gql`
 query UserTokens($owner: String!) {
  tokens(owner: $owner) {
    id,
    owner,
    uri
  }
}
`;
  const data = await request(endpoint, query, { owner: address });
  console.log('data', data);
  const avatars = data.tokens.map(token => {
    const uri = token.uri || "";
    let fields = {};
    const parts = uri.split("base64,")
    if (parts.length > 1) {
      try {
        console.log('decoding', parts[1]);
        fields = base64ToJSON(parts[1]);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      id: token.id,
      fields,
    }
  });
  return avatars;
}

