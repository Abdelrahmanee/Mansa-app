

import schedule from 'node-schedule'
import { userModel } from '../modules/user/models/user.model.js'
import axios from 'axios'





export const cron = () => {

   schedule.scheduleJob('0 0 0 1 * *', async function () {
      const deletedAccounts = await userModel.deleteMany({ email_verified: false })
      console.log(deletedAccounts);
   })
   schedule.scheduleJob('0 */10 * * * *', async function () {
      try {
         const response = await axios.post('http://localhost:3000/api/v1/auth/login' ,{identifier : '' , password :''});
         console.log('Response data:', response.data);
      } catch (error) {
         console.error('Error making request:', error);
      }
   });
}