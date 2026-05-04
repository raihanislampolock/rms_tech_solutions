import { DataSource } from "typeorm";
import { OtpModel } from "./modules/rbac/user/models/otp.model";
import { Config } from "./core/Config";
import fs from "fs";
import { UserModel } from "./modules/rbac/user/models/user.model";
import { RoleModel } from "./modules/rbac/role/models/role.model";
import { ProviderModel } from "./modules/rbac/user/models/provider.model";
import { PermissionModel } from "./modules/rbac/permission/modals/permission.model";
import { EmailConfigModel } from "./modules/it/email-admin/models/email.config.model";
import { RmsItemsModel } from "./modules/rms/models/rms.items.model";
import { RmsItemStockModel } from "./modules/rms/models/rms.itemstock.model";
import { RmsPurchaseModel } from "./modules/rms/models/rms.purchase.model";
import { RmsPurchaseItemModel } from "./modules/rms/models/rms.purchase.item.model";
import { RmsStockTransactionModel } from "./modules/rms/models/rms.stock.transaction.model";
import { RmsQuotationModel } from "./modules/rms/models/rms.quotation.model";
import { RmsQuotationItemModel } from "./modules/rms/models/rms.quotation.Item.model";
import { RmsDeliveryModel } from "./modules/rms/models/rms.delivery.model";
import { RmsDeliveryItemModel } from "./modules/rms/models/rms.delivery.item.model";
import { RmsStockMovementModel } from "./modules/rms/models/rms.stock-movement.model";


const APP_CONFIG: Config = new Config(JSON.parse(fs.readFileSync("config.json").toString()));


export const AppDataSource = new DataSource({
    type: "postgres",
    host: APP_CONFIG.postgres.dbHost || 'localhost',
    port: Number(APP_CONFIG.postgres.dbPort) || 5432,
    username: APP_CONFIG.postgres.dbUser || 'postgres',
    password: APP_CONFIG.postgres.dbPassword || 'secret',
    database: APP_CONFIG.postgres.dbName || 'rms_portal',
    entities: [UserModel, RoleModel, ProviderModel, PermissionModel, EmailConfigModel, RmsItemsModel, RmsItemStockModel, RmsPurchaseModel,
                RmsPurchaseItemModel, RmsStockTransactionModel, RmsQuotationModel, RmsQuotationItemModel, RmsDeliveryModel, RmsDeliveryItemModel
                , RmsStockMovementModel],
    synchronize: true, // Automatically sync entity schema (disable in production)
    logging: false,
});


export const initializeDatabase = async (): Promise<void> => {
    const maxRetries = 5; // Maximum number of retries
    let retries = 0; // Current retry count

    while (retries < maxRetries) {
        try {
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }

            console.log('Connected to PostgreSQL with TypeORM');

            // ✅ CREATE SEQUENCES if they don't exist
            await createSequences();

            return;
        } catch (error) {
            console.error('PostgreSQL connection error. Please make sure PostgreSQL is running:', error);
            retries += 1;
            console.log(`Retrying to connect... (${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
        }
    }

    console.error('Max retries reached. Could not connect to PostgreSQL.');
    process.exit(1);
};

// ✅ CREATE SEQUENCES
const createSequences = async (): Promise<void> => {
    try {
        // Create rms_ref_seq if it doesn't exist
        await AppDataSource.query(`
            CREATE SEQUENCE IF NOT EXISTS rms_ref_seq
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1;
        `);

        // Create rms_delivery_seq if it doesn't exist
        await AppDataSource.query(`
            CREATE SEQUENCE IF NOT EXISTS rms_delivery_seq
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1;
        `);

        // Create rms_purchase_seq if it doesn't exist
        await AppDataSource.query(`
            CREATE SEQUENCE IF NOT EXISTS rms_purchase_seq
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1;
        `);

        console.log('✅ Database sequences initialized');
    } catch (error) {
        console.error('Error creating sequences:', error);
    }
};

