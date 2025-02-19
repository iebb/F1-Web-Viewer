import Vue from "vue";
import Notifications from 'vue-notification'

import App from "./App.vue";
import router from "./router";
import store from "./store";

Vue.config.productionTip = false;
Vue.use(Notifications)

require("./assets/main.scss");

new Vue({
  store,
  router,
  render: h => h(App)
}).$mount("#app");
