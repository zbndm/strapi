import EarlyHintsPlugin from "2ll";

export const onRequest = [
  async (context) => {
    console.log("req");
    const response = await EarlyHintsPlugin()(context);
    console.log(response.headers.get("link"));
    return response;
  },
];


