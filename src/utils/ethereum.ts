import Web3 from 'web3';
import 'dotenv/config';

const { ETH_NETWORK_URL } = process.env;
const web3 = new Web3(ETH_NETWORK_URL);

export default web3;
