import {generateEnquiryBundle} from '../server/enquiry-bundle.mjs';
import {buildEnquiryHead} from '../server/enquiry-head.mjs';

await generateEnquiryBundle();
await buildEnquiryHead(true);
