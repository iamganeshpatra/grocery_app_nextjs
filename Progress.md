## ADMIN
**Today i have worked on create Admin pannel of my Grocery_App Project**
-I am completely understand how admin.actions.ts working of create,update and delete but not that organised way like your code.

*bulkCreateProducts()*::- I have doubt on code why use for loop here

*searchParams()*::-it is taken data from URL but not understand properly how it is working

*useTransition*::-
--it is a react hook 
--it is used to create and update heavy works in background
--when dont need UI to quick data that time it is use because it is working in background and it is help to UI not freeze and crashed
--synatx-
       const[ispending,startTransition]=useTransition()

       ispending=true :-means work in process
       startTransition :-it is a function which is used code run in lowpriority or background



---i have doubt on 
     const[dialogProduct,setDialogProduct]=useState()
     const[dialogOpen,setDialogOpen]=useState()

     and encodeURLComponent(search)



*app/admin/product/import/component/import-form.tsx*::- i have completely not understand this part of code


**user**
why also SUPER ADMIN is showing in user table because only access to see this part to Super admin


*shop-owner and return*::-completely understand becouse only render the data form batabase


**CONCLUSION**
## i understand how the CRUD(create,read,update and delete) are working inside admin.actions.ts file and i also learned little bit use of useTrasition() but not properly doink like your code 

