
// System
import path from "path";
import fs from "fs";
import { exit } from "process";
import cookieParser from 'cookie-parser';
import express from "express";

// Core
// import { mongoInit } from "./init";
import { Application } from "./core/Application";
import { Config } from "./core/Config";
import { Role } from "./core/IUserProvider";
import cron from "node-cron";
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io } from "./socket";
import { initSocket } from "./socket";

// Formatters
import { dateFormatter } from "./ftms/date";

// Controllers
import { LoginService } from "./modules/rbac/user/services/LoginService";
import { LoginController } from "./modules/rbac/user/controllers/LoginController";
import { UserRepository } from "./modules/rbac/user/repositories/UserRepository";
import { AppDataSource, initializeDatabase } from "./init";
import { SignUpController } from "./modules/rbac/user/controllers/SignUpController";
import { SignUpService } from "./modules/rbac/user/services/SignUpService";
import { RoleController } from "./modules/rbac/role/controllers/role.controller";
import { RoleRepository } from "./modules/rbac/role/repositories/role.repository";
import { RoleService } from "./modules/rbac/role/services/role.service";
import { userContext } from "./middlewares/userContext";
import { DashboardController } from "./modules/rbac/user/controllers/DashboardController";
import { DashboardRepository } from "./modules/rbac/user/repositories/DashboardRepository";
import { DashboardService } from "./modules/rbac/user/services/DashboardService";
import { PermissionController } from "./modules/rbac/permission/controllers/permission.controller";
import { PermissionService } from "./modules/rbac/permission/services/permission.service";
import { PermissionRepository } from "./modules/rbac/permission/repositories/permission.repositorie";
import { EmailConfigController } from "./modules/it/email-admin/controllers/email.config.controller";
import { EmailConfigRepository } from "./modules/it/email-admin/repositories/email.config.repository";
import { EmailConfigService } from "./modules/it/email-admin/services/email.config.service";
import { RmsItemsController } from "./modules/rms/controllers/rms.items.controller";
import { RmsItemsRepository } from "./modules/rms/repositories/rms.items.repository";
import { RmsItemsService } from "./modules/rms/services/rms.items.service";
import { RmsQuotationController } from "./modules/rms/controllers/rms.quotation.controller";
import { RmsQuotationRepository } from "./modules/rms/repositories/rms.quotation.repository";
import { RmsQuotationService } from "./modules/rms/services/rms.quotation.service";
import { RmsPurchaseController } from "./modules/rms/controllers/rms.purchase.controller";
import { RmsPurchaseService } from "./modules/rms/services/rms.purchase.service";
import { RmsItemStockController } from "./modules/rms/controllers/rms.itemstock.controller";
import { RmsItemStockRepository } from "./modules/rms/repositories/rms.itemstock.repository";
import { RmsItemStockService } from "./modules/rms/services/rms.itemstock.service";
import { RmsChallanController } from "./modules/rms/controllers/rms.challan.controller";
import { RmsChallanRepository } from "./modules/rms/repositories/rms.challan.repository";
import { RmsChallanService } from "./modules/rms/services/rms.challan.service";
import { RmsInvoiceController } from "./modules/rms/controllers/rms.invoice.controller";
import { RmsInvoiceRepository } from "./modules/rms/repositories/rms.invoice.repository";
import { RmsInvoiceService } from "./modules/rms/services/rms.invoice.service";
import { RmsTermsAndConditionsController } from "./modules/rms/controllers/rms.terms.and.conditions.controller";
import { RmsTermsAndConditionsRepository } from "./modules/rms/repositories/rms.terms.and.conditions.repository";
import { RmsTermsAndConditionsService } from "./modules/rms/services/rms.terms.and.conditions.service";
import { WebsiteController } from "./modules/website/controllers/website.controller";
import { WebsiteService } from "./modules/website/services/website.service";
import { WebsiteProductRepository  } from "./modules/website/repositories/website.product.repository";
import { WebsiteProductService } from "./modules/website/services/website.product.service";
import { WebsiteCartService } from "./modules/website/services/website.cart.service";
import { WebsiteCartController } from "./modules/website/controllers/website.cart.controller";
import { WebsiteCheckoutController } from "./modules/website/controllers/website.checkout.controller";
import { WebsiteOrderService } from "./modules/website/services/website.order.service";
import { WebsiteOrderRepository } from "./modules/website/repositories/website.order.repository";
import { WebsiteOrderController } from "./modules/website/controllers/website.order.controller";

// config
const CONFIG_FILE = "config.json";

if (!fs.existsSync(CONFIG_FILE)) {
    console.warn(`Can't find '${CONFIG_FILE}' please make sure config file is present in the current directory`);
    exit(0);
}

const APP_CONFIG: Config = new Config(JSON.parse(fs.readFileSync(CONFIG_FILE).toString()));

// Initialize mongo db
// mongoInit(APP_CONFIG.mongoUrl);

const app = Application.getInstance(APP_CONFIG);

app.viewDir("views");
app.viewEngine("pug");
app.setStatic(path.join(__dirname, "public"), { maxAge: 0 }); // 31557600000 turned off caching for now
app.getExpressApp().use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'))
);
app.use(userContext);

// Setup menu
app.setMenu("main", {
    items: [
        { name: "Dashboard", path: "/", for: [Role.Admin] },
        { name: "Report", path: "/report/weight-data", for: [Role.Admin, Role.Agent, Role.Customer] },
        { name: "RMS Items", path: "/rms/rms-items", for: [Role.Admin] },
        { name: "RMS Stock", path: "/rms/rms-stock", for: [Role.Admin] },
        { name: "RMS Purchases", path: "/rms/rms-purchase", for: [Role.Admin] },
        { name: "RMS Quotations", path: "/rms/rms-quotation", for: [Role.Admin] },
        { name: "RMS Deliveries", path: "/rms/rms-delivery", for: [Role.Admin] },
        { name: "RMS Challans", path: "/rms/rms-challan", for: [Role.Admin] },
        { name: "RMS Invoices", path: "/rms/rms-invoice", for: [Role.Admin] },
        { name: "<i class='large material-icons'>admin_panel_settings</i>", path: "/role-permissions", for: [Role.Admin] },
        { name: "<i class='large material-icons'>people</i>", path: "/users", for: [Role.Admin] },
        { name: "<i class='large material-icons'>security</i>", path: "/password/change", for: [Role.Admin] },
        { name: "<i class='large material-icons'>exit_to_app</i>", path: "/logout", for: [Role.Admin] }
    ]
})

// Add any formatters, you can access it by fmt.date in views like fmt.date.ymd()
app.setFormatter("date", dateFormatter);


app.set("UserRepository", new UserRepository());
app.set("RoleRepository", new RoleRepository());
app.set("DashboardRepository", new DashboardRepository());
app.set("PermissionRepository", new PermissionRepository());
app.set("EmailConfigRepository", new EmailConfigRepository());
app.set("RmsItemsRepository", new RmsItemsRepository());
app.set("RmsQuotationRepository", new RmsQuotationRepository());
app.set("RmsChallanRepository", new RmsChallanRepository());
app.set("RmsInvoiceRepository", new RmsInvoiceRepository());
app.set("RmsItemStockRepository", new RmsItemStockRepository());
app.set("RmsTermsAndConditionsRepository", new RmsTermsAndConditionsRepository());
app.set("WebsiteProductRepository", new WebsiteProductRepository());
app.set("WebsiteOrderRepository", new WebsiteOrderRepository());


app.set("SignUpService", new SignUpService(app.get("UserRepository"), AppDataSource));
app.set("LoginService", new LoginService(app.get("UserRepository")));
app.set("RoleService", new RoleService(app.get("RoleRepository")));
app.set("DashboardService", new DashboardService());
app.set("PermissionService", new PermissionService(app.get("PermissionRepository"), AppDataSource));
app.set("EmailConfigService", new EmailConfigService());
app.set("RmsItemsService", new RmsItemsService(app.get("RmsItemsRepository")));
app.set("RmsQuotationService", new RmsQuotationService(app.get("RmsQuotationRepository")));
app.set("RmsChallanService", new RmsChallanService(app.get("RmsChallanRepository")));
app.set("RmsInvoiceService", new RmsInvoiceService(app.get("RmsInvoiceRepository")));
app.set("RmsPurchaseService", new RmsPurchaseService(app.get("RmsPurchaseRepository")));
app.set("RmsItemStockService", new RmsItemStockService(app.get("RmsItemStockRepository")));
app.set("RmsTermsAndConditionsService", new RmsTermsAndConditionsService(app.get("RmsTermsAndConditionsRepository")));
app.set("WebsiteService", new WebsiteService());
app.set("WebsiteProductService", new WebsiteProductService( app.get("WebsiteProductRepository")));
app.set("WebsiteCartService", new WebsiteCartService());
app.set("WebsiteOrderService", new WebsiteOrderService(app.get("WebsiteOrderRepository")));


// Initialize and set the mailer to use
// const Mailer = new SMTPMailer(APP_CONFIG.smtp);
// app.set("Mailer", Mailer);

app.registerController(new SignUpController());
app.registerController(new LoginController());
// DashboardController will be registered after socket initialization
app.registerController(new RoleController());
app.registerController(new PermissionController());
app.registerController(new EmailConfigController());
app.registerController(new RmsItemsController());
app.registerController(new RmsQuotationController());
app.registerController(new RmsChallanController());
app.registerController(new RmsInvoiceController());
app.registerController(new RmsPurchaseController());
app.registerController(new RmsItemStockController());
app.registerController(new RmsTermsAndConditionsController());
app.registerController(new WebsiteController());
app.registerController(new WebsiteCartController());
app.registerController(new WebsiteCheckoutController());
app.registerController(new WebsiteOrderController());

// Finally setup the cron jobs
// cron.schedule("* * * * *", async () => {
//     try {
//         const labReportService = app.get<LabReportService>("LabReportService");
//         const emailService = app.get<EmailService>("EmailService");
//         await SendReportMail(AppDataSource, labReportService, emailService);
//     } catch (error) {
//         console.error("Error executing SendReportMail Cron:", error);
//     }
// });


// app.setupHandlers();

// Initialize database and then start the app
initializeDatabase()
    .then(async () => {

        // Start the Express server after the database connection is successful
        // Get the Express app
        const expressApp = app.getExpressApp();

        // Create HTTP server
        const server = createServer(expressApp);

        // Initialize Socket.IO
        const socketIO = initSocket(server);
        app.set('io', socketIO);

        // Register DashboardController after socket initialization
        app.registerController(new DashboardController(socketIO));

        // Start listening
        server.listen(APP_CONFIG.port, () => {
            console.log(`Server started at http://localhost:${APP_CONFIG.port}`);
        });
    })
    .catch(err => {
        console.error('Error during application setup:', err);
        process.exit(1); // Exit the process if initialization fails
    });

