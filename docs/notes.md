1. Add `bootstrap` to command in step 2
   e.g. `   "show-template": "cdk bootstrap --show-template > bootstrap-template.yaml --profile {{ aws-cli-profile }}",`
2. Step 3 add a command `"bootstrap-template": "cdk bootstrap --template bootstrap-template.yaml --qualifier {{ company-qualifier }} --profile {{ aws-cli-profile }}"`
e.g. for company-qualifier `alo`
3. Step 2 put an example specific for the Param store
   before Fn::Sub: /cdk-bootstrap/${Qualifier}/version
 after  Fn::Sub: /${Qualifier}/cdk-bootstrap/version

4. Modify the default value in the `bootstrap-template.yaml` to use the new qualifier instead of the old default `hnb659fds`
Qualifier:
    Description: An identifier to distinguish multiple bootstrap stacks in the same environment
    Default: alo