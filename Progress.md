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
## i understand how the CRUD(create,read,update and delete) are working inside admin.actions.ts file and i also learned little bit use of useTrasition() but not properly doing like your code 



## MANAGER
*Progress Report – 03 June 2026*

-- Today I worked on the authentication and manager access flow of the Grocery App project.

*Tasks Completed*
->Learned about @better-auth/utils/password and understood how password hassing used to secure authentication
->Doing some changes in Redirect-page because when Manager signin with temporary password that is not redirect to change-password path, I see the proxy.ts file everything redict properly but why change-password part is not redirect properly i can't understand

*Learning & Understanding*
->Improve understanding of password hassing and how secure authentication 
->Betterly know about role based redict and access controls

*Conclusion*
>complete manager flow and temporary password changed to secure password 
>Also testing my manager flow how it is workin