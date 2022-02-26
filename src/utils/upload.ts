import { NFTStorage } from 'nft.storage';
import 'dotenv/config';

const { NFT_STORAGE_KEY } = process.env;

const storage = new NFTStorage({ token: NFT_STORAGE_KEY });

export default storage;