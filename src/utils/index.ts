// 导入 Node.js 内置模块 - fs/promises 提供基于 Promise 的文件系统操作
import fs from "node:fs/promises";
// 导入 readline 模块用于处理命令行输入输出交互
import readline from "node:readline";
// 从常量文件中导入项目配置相关的常量
import {
  CONFIG_FILE,    // 配置文件路径
  DEFAULT_CONFIG, // 默认配置对象
  HOME_DIR,       // 主目录路径
  PLUGINS_DIR,    // 插件目录路径
} from "../constants";

/**
 * 确保目录存在的工具函数
 * @param dir_path - 目录路径，类型为 string
 * @returns Promise<void> - 返回空的 Promise，用于异步操作
 * 
 * 业务逻辑：
 * 1. 尝试访问指定目录
 * 2. 如果目录不存在，则递归创建目录及其父目录
 * 
 * TypeScript 语法说明：
 * - async 关键字声明异步函数，返回 Promise
 * - try-catch 用于错误处理
 * - await 等待异步操作完成
 */
const ensureDir = async (dir_path: string) => {
  try {
    // 尝试访问目录，如果目录存在则不会抛出错误
    await fs.access(dir_path);
  } catch {
    // 如果目录不存在，创建目录（包括所有必需的父目录）
    // recursive: true 表示递归创建父目录
    await fs.mkdir(dir_path, { recursive: true });
  }
};

/**
 * 初始化项目所需的目录结构
 * @returns Promise<void> - 返回空的 Promise
 * 
 * 业务逻辑：
 * 确保项目运行所需的主目录和插件目录都存在
 * 这是项目启动时的必要步骤
 */
export const initDir = async () => {
  // 确保主目录存在
  await ensureDir(HOME_DIR);
  // 确保插件目录存在
  await ensureDir(PLUGINS_DIR);
};

/**
 * 创建 readline 接口的工厂函数
 * @returns readline.Interface - 返回配置好的 readline 接口
 * 
 * 业务逻辑：
 * 创建用于命令行交互的 readline 接口，连接标准输入输出
 * 
 * TypeScript 语法说明：
 * - 函数返回类型自动推断为 readline.Interface
 */
const createReadline = () => {
  return readline.createInterface({
    input: process.stdin,   // 标准输入流
    output: process.stdout, // 标准输出流
  });
};

/**
 * 异步提问函数，用于获取用户在命令行的输入
 * @param query - 提问内容，类型为 string
 * @returns Promise<string> - 返回用户输入的字符串
 * 
 * 业务逻辑：
 * 1. 在命令行显示问题
 * 2. 等待用户输入
 * 3. 返回用户输入的内容并关闭 readline 接口
 * 
 * TypeScript 语法说明：
 * - Promise<string> 表明返回一个解析为字符串的 Promise
 * - 使用 Promise 构造函数创建自定义的异步操作
 * - resolve 函数用于完成 Promise
 */
const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    const rl = createReadline();
    // 显示问题并等待用户输入
    rl.question(query, (answer) => {
      rl.close(); // 关闭 readline 接口释放资源
      resolve(answer); // 返回用户输入的答案
    });
  });
};

/**
 * 确认函数，用于获取用户的确认操作（是/否）
 * @param query - 确认问题，类型为 string
 * @returns Promise<boolean> - 返回布尔值，true 表示确认，false 表示拒绝
 * 
 * 业务逻辑：
 * 1. 向用户提出确认问题
 * 2. 将用户输入转换为小写进行比较
 * 3. 如果用户输入不是 "n"，则认为是确认操作
 * 
 * TypeScript 语法说明：
 * - async/await 语法糖简化 Promise 处理
 * - 函数返回类型明确声明为 Promise<boolean>
 */
const confirm = async (query: string): Promise<boolean> => {
  const answer = await question(query);
  // 只有当用户明确输入 "n" 时才返回 false，其他情况都视为确认
  return answer.toLowerCase() !== "n";
};

/**
 * 读取配置文件函数
 * @returns Promise<any> - 返回配置对象，类型为 any（可以考虑定义具体的配置接口）
 * 
 * 业务逻辑：
 * 1. 尝试读取现有的配置文件
 * 2. 如果文件不存在或读取失败，则引导用户创建新的配置
 * 3. 通过命令行交互收集配置信息
 * 4. 生成默认配置并保存到文件
 * 
 * TypeScript 语法说明：
 * - try-catch 异常处理机制
 * - Object.assign() 用于对象合并
 * - await 串行等待多个异步操作
 */
export const readConfigFile = async () => {
  try {
    // 尝试读取配置文件
    const config = await fs.readFile(CONFIG_FILE, "utf-8");
    // 将 JSON 字符串解析为对象
    return JSON.parse(config);
  } catch {
    // 如果配置文件不存在，通过交互式问答创建配置
    const name = await question("Enter Provider Name: ");
    const APIKEY = await question("Enter Provider API KEY: ");
    const baseUrl = await question("Enter Provider URL: ");
    const model = await question("Enter MODEL Name: ");
    
    // 构建配置对象
    // Object.assign() 将默认配置与用户输入合并
    const config = Object.assign({}, DEFAULT_CONFIG, {
      Providers: [
        {
          name,                  // 提供商名称
          api_base_url: baseUrl, // API 基础 URL
          api_key: APIKEY,       // API 密钥
          models: [model],       // 可用模型列表
        },
      ],
      Router: {
        // 设置默认的路由配置：提供商名称,模型名称
        default: `${name},${model}`,
      },
    });
    
    // 将新创建的配置保存到文件
    await writeConfigFile(config);
    return config;
  }
};

/**
 * 写入配置文件函数
 * @param config - 配置对象，类型为 any
 * @returns Promise<void> - 返回空的 Promise
 * 
 * 业务逻辑：
 * 1. 确保主目录存在
 * 2. 将配置对象序列化为 JSON 格式
 * 3. 写入到配置文件中
 * 
 * TypeScript 语法说明：
 * - 参数类型注解 config: any
 * - JSON.stringify() 的第三个参数指定缩进空格数，使 JSON 格式化
 */
export const writeConfigFile = async (config: any) => {
  // 确保配置文件所在目录存在
  await ensureDir(HOME_DIR);
  // 将配置对象格式化为 JSON 字符串并写入文件
  // null 参数表示不使用 replacer 函数，2 表示缩进 2 个空格
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
};

/**
 * 初始化配置函数
 * @returns Promise<any> - 返回配置对象
 * 
 * 业务逻辑：
 * 1. 读取或创建配置文件
 * 2. 将配置信息设置到进程环境变量中
 * 3. 返回配置对象供应用程序使用
 * 
 * TypeScript 语法说明：
 * - Object.assign() 将配置对象的属性复制到 process.env
 * - process.env 是 Node.js 全局对象，包含环境变量
 */
export const initConfig = async () => {
  // 读取配置文件（如果不存在会自动创建）
  const config = await readConfigFile();
  // 将配置信息合并到环境变量中，方便其他模块访问
  Object.assign(process.env, config);
  return config;
};
