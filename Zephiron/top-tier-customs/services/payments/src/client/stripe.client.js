import { stripe } from "../config/stripe.js";
import { getUser, setCustomerStripeID } from "./auth.client.js";

export const ensureStripeCustomerForUser = async (userID) => {
  const user = await getUser(userID);

  if (user?.stripe?.customerID) {
    return user.stripe.customerID;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.profile?.first_name} ${user.profile?.last_name}`,
    metadata: { userID: String(userID) },
  });

  await setCustomerStripeID(userID, customer.id);

  return customer.id;
};
