import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as appsync from '@aws-cdk/aws-appsync';
import * as events from '@aws-cdk/aws-events';
import * as eventsTargets from '@aws-cdk/aws-events-targets';
import * as dynamoDB from '@aws-cdk/aws-dynamodb';
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as origins from "@aws-cdk/aws-cloudfront-origins";
import * as s3 from "@aws-cdk/aws-s3";
import * as s3deploy from "@aws-cdk/aws-s3-deployment";
import { requestTemplate, responseTemplate, EVENT_SOURCE } from '../utils/appsync-request-response';

export class CdkBackendStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const BookmarkAPI = new appsync.GraphqlApi(this, 'BookmarkApi', {
      name: "appsyncEventBridgeBookmarkApi",
      schema: appsync.Schema.fromAsset("utils/schema.gql"),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY
        }
      },
      xrayEnabled: true
    });

    new cdk.CfnOutput(this, 'bookmarkURL',{
      value: BookmarkAPI.graphqlUrl
    });

    new cdk.CfnOutput(this, 'BookmarkApi-ID', {
      value: BookmarkAPI.apiId || ''
    });

    new cdk.CfnOutput(this, 'Bookmarkapi-key', {
      value: BookmarkAPI.apiKey || ''
    });

    //////////////////// Bookmark DynamoDB Table ////////////////////////
    const BookmarkTable = new dynamoDB.Table(this, 'BookmarkTable', {
      tableName: "BookmarkTable",
      partitionKey: {
        name: 'id',
        type: dynamoDB.AttributeType.STRING,
      },
    });

    /////////////////////// DynamoDB as a Datasource for the Graphql API  //////////////////////
    const BookmarkAppDS = BookmarkAPI.addDynamoDbDataSource('BookmarkAppDataSource', BookmarkTable);

    ////////////////////////////// Creating Lambda handler //////////////////////

    const dynamoHandlerLambda = new lambda.Function(this, 'Dynamo_Handler', {
      code: lambda.Code.fromAsset('lambda'),
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'dynamoHandler.handler',
      environment: {
        DYNAMO_TABLE_NAME: BookmarkTable.tableName,
      },
    });

    // Giving Table access to dynamoHandlerLambda
    BookmarkTable.grantReadWriteData(dynamoHandlerLambda);

    BookmarkAppDS.createResolver({
      typeName: "Query",
      fieldName: 'getBookmarks',
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });


    // HTTP as Datasource for the Graphql API
    const httpEventTriggerDS = BookmarkAPI.addHttpDataSource(
      "eventTriggerDS",
      "https://events." + this.region + ".amazonaws.com/", // This is the ENDPOINT for eventbridge.
      {
        name: "httpDsWithEventBridge",
        description: "From Appsync to Eventbridge",
        authorizationConfig: {
          signingRegion: this.region,
          signingServiceName: "events",
        },
      }
    );

    /* Mutation */
    const mutations = ["addBookmark", "deleteBookmark"]
    mutations.forEach((mut) => {
      let details = `\\\"bookmarkId\\\": \\\"$ctx.args.bookmarkId\\\"`;
      if (mut === 'addBookmark') {
        details = `\\\"url\\\":\\\"$ctx.args.bookmark.url\\\" , \\\"desc\\\":\\\"$ctx.args.bookmark.desc\\\"`
      } else if (mut === "deleteBookmark") {
        details = `\\\"bookmarkId\\\":\\\"$ctx.args.bookmarkId\\\"`
      }
      httpEventTriggerDS.createResolver({
        typeName: "Mutation",
        fieldName: mut,
        requestMappingTemplate: appsync.MappingTemplate.fromString(requestTemplate(details, mut)),
        responseMappingTemplate: appsync.MappingTemplate.fromString(responseTemplate()),
      });
    });

    events.EventBus.grantPutEvents(httpEventTriggerDS);

    ////////// Creating rule to invoke lambda function on event ///////////////////////
    new events.Rule(this, "eventConsumerRule", {
      eventPattern: {
        source: [EVENT_SOURCE],
      },
      targets: [new eventsTargets.LambdaFunction(dynamoHandlerLambda)]
    });


    //here I define s3 bucket 
    const bookmarkBucket = new s3.Bucket(this, "bookmarkBucket", {
      versioned: true,
    });

    bookmarkBucket.grantPublicAccess(); // website visible to all.

    // create a CDN to deploy your website
    const distribution = new cloudfront.Distribution(this, "BookmarkDistribution", {
      defaultBehavior: {
        origin: new origins.S3Origin(bookmarkBucket),
      },
      defaultRootObject: "index.html",
    });


    // Prints out the web endpoint to the terminal
    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: distribution.domainName,
    });


    // housekeeping for uploading the data in bucket 
    new s3deploy.BucketDeployment(this, "DeployBookmarkApp", {
      sources: [s3deploy.Source.asset("../bookmarkfrontend/public")],
      destinationBucket: bookmarkBucket,
      distribution,
      distributionPaths: ["/*"],
    });
  }
}