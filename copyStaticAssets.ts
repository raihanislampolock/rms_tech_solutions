import * as shell from "shelljs";
shell.cp("-R", "src/public/bower_components", "build/public/");
shell.cp("-R", "src/public/dist", "build/public/");
shell.cp("-R", "src/public/plugins", "build/public/");
