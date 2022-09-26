import gra from "2ll"
//import headersPlugin from "@cloudflare/pages-plugin-headers";
import staticFormsPlugin from "@cloudflare/pages-plugin-static-forms"



export const onRequest: PagesFunction[] = [
 
  ({ next }) => {
    try {
      return next();
    } catch (thrown) {
      return new Response(`${thrown}`, { status: 500 });
    }
  },
  // sentryPlugin({
  //   // dsn: "https://sentry.io/xyz",
  // }),
  // headersPlugin({
  //   "Access-Control-Allow-Origin": "*",
  // }),
  gra({
  
}),
     staticFormsPlugin({
  respondWith: ({ formData, name }) => {
    const email = formData.get('email')
    return new Response(`Hello, ${email}! Thank you for submitting the ${name} form.`)
  }
})
];
